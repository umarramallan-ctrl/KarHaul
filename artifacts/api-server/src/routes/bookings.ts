import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bookingsTable, shipmentsTable, usersTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import { createNotification } from "../lib/notify";
import { releaseEscrow } from "./stripe";
import { CANCELLATION_WINDOW_MS } from "../lib/stripe";

const router: IRouter = Router();

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

router.get("/bookings", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) {
    res.json({ bookings: [], total: 0 });
    return;
  }
  const bookings = await db.select().from(bookingsTable)
    .where(or(eq(bookingsTable.shipperId, dbUser.id), eq(bookingsTable.driverId, dbUser.id)))
    .orderBy(desc(bookingsTable.createdAt));
  const enriched = await Promise.all(bookings.map(async (b) => {
    const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, b.shipmentId)).limit(1);
    const [driver] = await db.select().from(usersTable).where(eq(usersTable.id, b.driverId)).limit(1);
    const [shipper] = await db.select().from(usersTable).where(eq(usersTable.id, b.shipperId)).limit(1);
    return { ...b, shipment: shipment || null, driver: driver || null, shipper: shipper || null };
  }));
  res.json({ bookings: enriched, total: enriched.length });
});

router.get("/bookings/:bookingId", async (req, res) => {
  const { bookingId } = req.params;
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (!booking) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, booking.shipmentId)).limit(1);
  const [driver] = await db.select().from(usersTable).where(eq(usersTable.id, booking.driverId)).limit(1);
  const [shipper] = await db.select().from(usersTable).where(eq(usersTable.id, booking.shipperId)).limit(1);
  res.json({ ...booking, shipment: shipment || null, driver: driver || null, shipper: shipper || null });
});

router.put("/bookings/:bookingId/status", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const dbUser = await getDbUser((req.user as any).id);
  const { bookingId } = req.params;
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (!booking) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (booking.driverId !== dbUser?.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { status, trackingNotes } = req.body;
  const updateData: any = { status, updatedAt: new Date() };
  if (trackingNotes) updateData.trackingNotes = trackingNotes;
  if (status === "picked_up") updateData.pickupConfirmedAt = new Date();
  if (status === "delivered") {
    updateData.deliveryConfirmedAt = new Date();
    await db.update(shipmentsTable).set({ status: "delivered", updatedAt: new Date() }).where(eq(shipmentsTable.id, booking.shipmentId));
    // Increment completed count for both the driver and the shipper
    await db.update(usersTable).set({ completedJobs: (dbUser.completedJobs || 0) + 1 }).where(eq(usersTable.id, dbUser.id));
    const [shipper] = await db.select().from(usersTable).where(eq(usersTable.id, booking.shipperId)).limit(1);
    if (shipper) {
      await db.update(usersTable).set({ completedJobs: (shipper.completedJobs || 0) + 1 }).where(eq(usersTable.id, booking.shipperId));
    }
    // Release both escrow amounts to the platform on delivery
    const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, booking.shipmentId)).limit(1);
    await releaseEscrow(shipment, booking, "capture", "capture");
    await createNotification({
      userId: booking.shipperId,
      type: "escrow_released",
      title: "Escrow released",
      body: "Delivery confirmed — your platform fee has been collected.",
      linkPath: `/bookings/${booking.id}`,
    });
    await createNotification({
      userId: booking.driverId,
      type: "escrow_released",
      title: "Escrow released",
      body: "Delivery confirmed — your platform fee has been collected.",
      linkPath: `/bookings/${booking.id}`,
    });
    await createNotification({
      userId: booking.shipperId,
      type: "delivery_confirmation_request",
      title: "Delivery confirmed",
      body: "Your vehicle has been delivered. Please confirm and leave a review.",
      linkPath: `/bookings/${booking.id}`,
    });
  }
  await db.update(bookingsTable).set(updateData).where(eq(bookingsTable.id, bookingId));
  const [updated] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);

  // Notify the shipper about status changes
  const statusLabels: Record<string, string> = {
    picked_up: "Vehicle picked up",
    in_transit: "Vehicle in transit",
    delivered: "Vehicle delivered",
    cancelled: "Booking cancelled",
  };
  const label = statusLabels[status];
  if (label) {
    await createNotification({
      userId: booking.shipperId,
      type: "booking_status",
      title: label,
      body: `Your booking status has been updated to: ${status.replace(/_/g, " ")}.`,
      linkPath: `/bookings/${bookingId}`,
    });
  }

  // When delivered, prompt both parties to leave a review
  if (status === "delivered") {
    await createNotification({
      userId: booking.shipperId,
      type: "booking_status",
      title: "Rate your driver",
      body: "Your vehicle was delivered! Share your experience by leaving a review.",
      linkPath: `/bookings/${bookingId}`,
    });
    await createNotification({
      userId: booking.driverId,
      type: "booking_status",
      title: "Rate your shipper",
      body: "Job complete! Take a moment to leave a review for your shipper.",
      linkPath: `/bookings/${bookingId}`,
    });
  }

  res.json(updated);
});

export default router;
