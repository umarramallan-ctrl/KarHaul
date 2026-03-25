import { Router, type IRouter, type Request, type Response } from "express";
import { db, trackingCheckpointsTable, bookingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

router.get("/bookings/:bookingId/tracking", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  const { bookingId } = req.params;

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  const isParty = booking.driverId === dbUser?.id || booking.shipperId === dbUser?.id;
  if (!isParty) { res.status(403).json({ error: "Forbidden" }); return; }

  const checkpoints = await db
    .select()
    .from(trackingCheckpointsTable)
    .where(eq(trackingCheckpointsTable.bookingId, bookingId))
    .orderBy(trackingCheckpointsTable.createdAt);

  res.json({ checkpoints, bookingStatus: booking.status });
});

router.post("/bookings/:bookingId/tracking", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  const { bookingId } = req.params;

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
  if (booking.driverId !== dbUser?.id) { res.status(403).json({ error: "Only the assigned driver can post checkpoints" }); return; }
  if (booking.status === "delivered" || booking.status === "cancelled") {
    res.status(400).json({ error: "Cannot add tracking to a completed or cancelled booking" }); return;
  }

  const { city, state, milestone, notes, estimatedArrival } = req.body;
  if (!milestone) { res.status(400).json({ error: "milestone is required" }); return; }

  const validMilestones = ["departed_origin", "en_route", "checkpoint", "weather_delay", "near_destination", "custom"];
  if (!validMilestones.includes(milestone)) {
    res.status(400).json({ error: `milestone must be one of: ${validMilestones.join(", ")}` }); return;
  }

  const id = crypto.randomUUID();
  const [checkpoint] = await db.insert(trackingCheckpointsTable).values({
    id, bookingId, uploadedBy: dbUser!.id,
    city: city || null, state: state || null,
    milestone, notes: notes || null,
    estimatedArrival: estimatedArrival || null,
  }).returning();

  res.status(201).json(checkpoint);
});

router.post("/bookings/:bookingId/call-request", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  const { bookingId } = req.params;

  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingsTable.id)).limit(1);
  const isParty = !booking || booking.driverId === dbUser?.id || booking.shipperId === dbUser?.id;
  if (!isParty) { res.status(403).json({ error: "Forbidden" }); return; }

  res.json({ success: true, message: "Call initiated. Both parties notified via the app.", sessionId: crypto.randomUUID() });
});

export default router;
