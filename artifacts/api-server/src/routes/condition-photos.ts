import { Router, type IRouter, type Request, type Response } from "express";
import { db, conditionPhotosTable, bookingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/bookings/:bookingId/photos", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
  const bookingId = req.params.bookingId as string;
  try {
    const photos = await db.select().from(conditionPhotosTable)
      .where(eq(conditionPhotosTable.bookingId, bookingId))
      .orderBy(conditionPhotosTable.createdAt);
    res.json({ photos });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch photos" });
  }
});

router.post("/bookings/:bookingId/photos", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
  const userId = req.user!.id;
  const bookingId = req.params.bookingId as string;
  const { photoUrl, phase, caption } = req.body;
  if (!photoUrl || !phase) { res.status(400).json({ error: "photoUrl and phase are required" }); return; }
  if (!["pickup", "delivery"].includes(phase)) { res.status(400).json({ error: "phase must be 'pickup' or 'delivery'" }); return; }
  try {
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    const isParty = booking.driverId === userId || booking.shipperId === userId;
    if (!isParty) { res.status(403).json({ error: "Not authorized" }); return; }
    const id = crypto.randomUUID();
    const [photo] = await db.insert(conditionPhotosTable).values({
      id, bookingId, uploadedBy: userId, phase, photoUrl, caption: caption || null,
    }).returning();
    res.status(201).json(photo);
  } catch (err) {
    res.status(500).json({ error: "Failed to add photo" });
  }
});

export default router;
