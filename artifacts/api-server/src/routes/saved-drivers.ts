import { Router, type IRouter, type Request, type Response } from "express";
import { db, savedDriversTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/saved-drivers", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
  const userId = req.user!.id;
  try {
    const saved = await db
      .select({
        id: savedDriversTable.id,
        shipperId: savedDriversTable.shipperId,
        driverId: savedDriversTable.driverId,
        note: savedDriversTable.note,
        createdAt: savedDriversTable.createdAt,
        driver: {
          id: usersTable.id,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          isVerified: usersTable.isVerified,
          averageRating: usersTable.averageRating,
          totalReviews: usersTable.totalReviews,
          completedJobs: usersTable.completedJobs,
          truckType: usersTable.truckType,
          dotNumber: usersTable.dotNumber,
          profileImageUrl: usersTable.profileImageUrl,
        },
      })
      .from(savedDriversTable)
      .leftJoin(usersTable, eq(savedDriversTable.driverId, usersTable.id))
      .where(eq(savedDriversTable.shipperId, userId));
    res.json({ savedDrivers: saved });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch saved drivers" });
  }
});

router.post("/saved-drivers", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
  const userId = req.user!.id;
  const { driverId, note } = req.body;
  if (!driverId) { res.status(400).json({ error: "driverId is required" }); return; }
  try {
    const existing = await db.select().from(savedDriversTable)
      .where(and(eq(savedDriversTable.shipperId, userId), eq(savedDriversTable.driverId, driverId)));
    if (existing.length > 0) { res.status(409).json({ error: "Driver already saved" }); return; }
    const id = crypto.randomUUID();
    const [saved] = await db.insert(savedDriversTable).values({ id, shipperId: userId, driverId, note: note || null }).returning();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: "Failed to save driver" });
  }
});

router.delete("/saved-drivers/:driverId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
  const userId = req.user!.id;
  const driverId = req.params.driverId as string;
  try {
    await db.delete(savedDriversTable)
      .where(and(eq(savedDriversTable.shipperId, userId), eq(savedDriversTable.driverId, driverId)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove saved driver" });
  }
});

// Aliases under /users/saved-drivers for REST consistency
router.get("/users/saved-drivers", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
  const userId = req.user!.id;
  try {
    const saved = await db
      .select({
        id: savedDriversTable.id,
        shipperId: savedDriversTable.shipperId,
        driverId: savedDriversTable.driverId,
        note: savedDriversTable.note,
        createdAt: savedDriversTable.createdAt,
        driver: {
          id: usersTable.id,
          firstName: usersTable.firstName,
          lastName: usersTable.lastName,
          isVerified: usersTable.isVerified,
          averageRating: usersTable.averageRating,
          totalReviews: usersTable.totalReviews,
          completedJobs: usersTable.completedJobs,
          truckType: usersTable.truckType,
          dotNumber: usersTable.dotNumber,
          profileImageUrl: usersTable.profileImageUrl,
        },
      })
      .from(savedDriversTable)
      .leftJoin(usersTable, eq(savedDriversTable.driverId, usersTable.id))
      .where(eq(savedDriversTable.shipperId, userId));
    res.json({ savedDrivers: saved });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch saved drivers" });
  }
});

router.post("/users/saved-drivers/:driverId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
  const userId = req.user!.id;
  const driverId = req.params.driverId as string;
  const { note } = req.body;
  try {
    const existing = await db.select().from(savedDriversTable)
      .where(and(eq(savedDriversTable.shipperId, userId), eq(savedDriversTable.driverId, driverId)));
    if (existing.length > 0) { res.status(409).json({ error: "Driver already saved" }); return; }
    const id = crypto.randomUUID();
    const [saved] = await db.insert(savedDriversTable).values({ id, shipperId: userId, driverId, note: note || null }).returning();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: "Failed to save driver" });
  }
});

router.delete("/users/saved-drivers/:driverId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
  const userId = req.user!.id;
  const driverId = req.params.driverId as string;
  try {
    await db.delete(savedDriversTable)
      .where(and(eq(savedDriversTable.shipperId, userId), eq(savedDriversTable.driverId, driverId)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove saved driver" });
  }
});

export default router;
