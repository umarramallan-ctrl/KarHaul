import { Router, type IRouter, type Request, type Response } from "express";
import { db, conditionPhotosTable, bookingsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createNotification } from "../lib/notify";

const router: IRouter = Router();

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

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
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.status(401).json({ error: "User not found" }); return; }

  const bookingId = req.params.bookingId as string;
  const { photoUrl, phase, caption } = req.body;
  if (!photoUrl || !phase) { res.status(400).json({ error: "photoUrl and phase are required" }); return; }
  if (!["pickup", "delivery"].includes(phase)) { res.status(400).json({ error: "phase must be 'pickup' or 'delivery'" }); return; }

  try {
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    const isParty = booking.driverId === dbUser.id || booking.shipperId === dbUser.id;
    if (!isParty) { res.status(403).json({ error: "Not authorized" }); return; }

    const id = crypto.randomUUID();
    const [photo] = await db.insert(conditionPhotosTable).values({
      id, bookingId, uploadedBy: dbUser.id, phase, photoUrl, caption: caption || null,
    }).returning();

    // Notify the other party
    const otherPartyId = dbUser.id === booking.driverId ? booking.shipperId : booking.driverId;
    const phaseLabel = phase === "pickup" ? "Pre-loading" : "Post-delivery";
    const uploaderRole = dbUser.id === booking.driverId ? "Driver" : "Shipper";
    await createNotification({
      userId: otherPartyId,
      type: "photo_uploaded",
      title: `${phaseLabel} photos uploaded`,
      body: `${uploaderRole} uploaded ${phase} condition photos for your booking. Tap to view.`,
      linkPath: `/bookings/${bookingId}`,
    });

    res.status(201).json(photo);
  } catch (err) {
    res.status(500).json({ error: "Failed to add photo" });
  }
});

export default router;
