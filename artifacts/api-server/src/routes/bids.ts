import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bidsTable, shipmentsTable, bookingsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

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

router.post("/shipments/:shipmentId/bids", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) {
    res.status(400).json({ error: "Profile not found" });
    return;
  }
  const { shipmentId } = req.params;
  const body = req.body;
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
  await db.update(shipmentsTable)
    .set({ bidCount: (await db.select().from(bidsTable).where(eq(bidsTable.shipmentId, shipmentId))).length })
    .where(eq(shipmentsTable.id, shipmentId));
  const [bid] = await db.select().from(bidsTable).where(eq(bidsTable.id, id)).limit(1);
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
  await db.update(bidsTable).set({ status: "accepted", updatedAt: new Date() }).where(eq(bidsTable.id, bidId));
  await db.update(bidsTable).set({ status: "rejected", updatedAt: new Date() })
    .where(and(eq(bidsTable.shipmentId, bid.shipmentId), eq(bidsTable.status, "pending")));
  await db.update(shipmentsTable).set({ status: "assigned", assignedDriverId: bid.driverId, updatedAt: new Date() })
    .where(eq(shipmentsTable.id, bid.shipmentId));
  const bookingId = randomUUID();
  await db.insert(bookingsTable).values({
    id: bookingId,
    shipmentId: bid.shipmentId,
    driverId: bid.driverId,
    shipperId: shipment.shipperId,
    bidId: bid.id,
    agreedPrice: bid.amount,
    status: "confirmed",
  });
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  res.json(booking);
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
