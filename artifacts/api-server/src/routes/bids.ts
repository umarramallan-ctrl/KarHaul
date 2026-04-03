import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bidsTable, shipmentsTable, bookingsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createNotification } from "../lib/notify";
import { bidLimiter } from "../lib/rate-limit";

const router: IRouter = Router();

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

router.get("/shipments/:shipmentId/bids", async (req, res) => {
  const { shipmentId } = req.params;
  const bids = await db.select().from(bidsTable).where(eq(bidsTable.shipmentId, shipmentId)).orderBy(desc(bidsTable.createdAt));
  const enriched = await Promise.all(bids.map(async (b) => {
    const [driver] = await db.select().from(usersTable).where(eq(usersTable.id, b.driverId)).limit(1);
    return { ...b, driver: driver || null };
  }));
  res.json({ bids: enriched, total: enriched.length });
});

router.post("/shipments/:shipmentId/bids", bidLimiter, async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) {
    res.status(400).json({ error: "Profile not found" });
    return;
  }
  const shipmentId = req.params.shipmentId as string;
  const body = req.body;

  // Prevent duplicate pending bid from the same driver
  const [existingBid] = await db.select().from(bidsTable)
    .where(and(eq(bidsTable.shipmentId, shipmentId), eq(bidsTable.driverId, dbUser.id), eq(bidsTable.status, "pending")))
    .limit(1);
  if (existingBid) {
    res.status(409).json({ error: "You already have an active bid on this shipment. Revoke it before placing a new one." });
    return;
  }

  // Verify the shipment is still open
  const [targetShipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, shipmentId)).limit(1);
  if (!targetShipment) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  if (targetShipment.status !== "open") {
    res.status(400).json({ error: "This shipment is no longer accepting bids." });
    return;
  }

  const id = randomUUID();
  await db.insert(bidsTable).values({
    id,
    shipmentId,
    driverId: dbUser.id,
    amount: body.amount,
    note: body.note || null,
    estimatedPickupDate: body.estimatedPickupDate || null,
    estimatedDeliveryDate: body.estimatedDeliveryDate || null,
    status: "pending",
  });
  const allBids = await db.select().from(bidsTable).where(eq(bidsTable.shipmentId, shipmentId));
  await db.update(shipmentsTable)
    .set({ bidCount: allBids.length })
    .where(eq(shipmentsTable.id, shipmentId));
  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, id)).limit(1);

  // Notify the shipment owner
  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, shipmentId)).limit(1);
  if (shipment) {
    const driverName = `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() || "A driver";
    await createNotification({
      userId: shipment.shipperId,
      type: "bid_received",
      title: "New bid received",
      body: `${driverName} placed a $${body.amount} bid on your shipment.`,
      linkPath: `/shipments/${shipmentId}`,
    });
  }

  res.status(201).json(bid);
});

router.post("/bids/:bidId/accept", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const dbUser = await getDbUser((req.user as any).id);
  const { bidId } = req.params;
  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, bidId)).limit(1);
  if (!bid) {
    res.status(404).json({ error: "Bid not found" });
    return;
  }
  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, bid.shipmentId)).limit(1);
  if (!shipment) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  if (shipment.shipperId !== dbUser?.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  // Collect pending bids to notify rejected drivers before updating
  const pendingBids = await db.select().from(bidsTable)
    .where(and(eq(bidsTable.shipmentId, bid.shipmentId), eq(bidsTable.status, "pending")));

  await db.update(bidsTable).set({ status: "accepted", updatedAt: new Date() }).where(eq(bidsTable.id, bidId));
  await db.update(bidsTable).set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(bidsTable.shipmentId, bid.shipmentId), eq(bidsTable.status, "pending")));
  await db.update(shipmentsTable).set({ status: "assigned", assignedDriverId: bid.driverId, updatedAt: new Date() })
    .where(eq(shipmentsTable.id, bid.shipmentId));
  const bookingId = randomUUID();
  const PLATFORM_FEE_PERCENT = 3.0;
  const platformFeeAmount = Math.round(bid.amount * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
  await db.insert(bookingsTable).values({
    id: bookingId,
    shipmentId: bid.shipmentId,
    driverId: bid.driverId,
    shipperId: shipment.shipperId,
    bidId: bid.id,
    agreedPrice: bid.amount,
    platformFeePercent: PLATFORM_FEE_PERCENT,
    platformFeeAmount,
    status: "confirmed",
  });
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);

  // Notify accepted driver
  await createNotification({
    userId: bid.driverId,
    type: "bid_accepted",
    title: "Your bid was accepted!",
    body: `Your $${bid.amount} bid has been accepted. Check your bookings.`,
    linkPath: `/bookings/${bookingId}`,
  });

  // Notify other drivers their bids were rejected
  for (const rejected of pendingBids) {
    if (rejected.driverId !== bid.driverId) {
      await createNotification({
        userId: rejected.driverId,
        type: "bid_rejected",
        title: "Bid not selected",
        body: "The shipper selected another driver for this load.",
        linkPath: `/shipments/${bid.shipmentId}`,
      });
    }
  }

  res.json(booking);
});

router.delete("/bids/:bidId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  const { bidId } = req.params;

  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, bidId)).limit(1);
  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }
  if (bid.driverId !== dbUser?.id) { res.status(403).json({ error: "Forbidden" }); return; }
  if (bid.status !== "pending") {
    res.status(400).json({ error: "Only pending bids can be revoked." });
    return;
  }

  await db.update(bidsTable).set({ status: "withdrawn", updatedAt: new Date() }).where(eq(bidsTable.id, bidId));

  // Update bid count on the shipment
  const remainingBids = await db.select().from(bidsTable)
    .where(and(eq(bidsTable.shipmentId, bid.shipmentId), eq(bidsTable.status, "pending")));
  await db.update(shipmentsTable)
    .set({ bidCount: remainingBids.length })
    .where(eq(shipmentsTable.id, bid.shipmentId));

  res.json({ success: true });
});

router.get("/bids/my", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) {
    res.json({ bids: [], total: 0 });
    return;
  }
  const bids = await db.select().from(bidsTable).where(eq(bidsTable.driverId, dbUser.id)).orderBy(desc(bidsTable.createdAt));
  const enriched = await Promise.all(bids.map(async (b) => {
    const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, b.shipmentId)).limit(1);
    return { ...b, shipment: shipment || null };
  }));
  res.json({ bids: enriched, total: enriched.length });
});

export default router;
