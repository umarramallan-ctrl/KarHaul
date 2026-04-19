import { Router, type IRouter, type Request, type Response } from "express";
import { db, savedDriversTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// Ensure saved_drivers table exists (idempotent)
async function ensureSavedDriversTable() {
    try {
          await db.execute(sql`
                CREATE TABLE IF NOT EXISTS saved_drivers (
                        id TEXT PRIMARY KEY,
                                shipper_id TEXT NOT NULL,
                                        driver_id TEXT NOT NULL,
                                                note TEXT,
                                                        created_at TIMESTAMP NOT NULL DEFAULT NOW()
                                                              )
                                                                  `);
    } catch (err) {
          console.error("[saved-drivers] table ensure failed:", err);
    }
}
ensureSavedDriversTable();

async function getDbUser(authId: string) {
    const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
    return users[0] || null;
}

async function resolveUser(req: Request) {
    const authId = req.user?.id || getAuth(req).userId;
    if (!authId) return null;
    return getDbUser(authId);
}

const SELECT_DRIVER_FIELDS = {
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
};

router.get("/saved-drivers", async (req: Request, res: Response) => {
    const dbUser = await resolveUser(req);
    if (!dbUser) { res.status(401).json({ error: "Authentication required" }); return; }
    try {
          const saved = await db
            .select(SELECT_DRIVER_FIELDS)
            .from(savedDriversTable)
            .leftJoin(usersTable, eq(savedDriversTable.driverId, usersTable.id))
            .where(eq(savedDriversTable.shipperId, dbUser.id));
          res.json({ savedDrivers: saved });
    } catch (err) {
          console.error("[saved-drivers GET] error:", err);
          res.status(500).json({ error: "Failed to fetch saved drivers" });
    }
});

router.post("/saved-drivers", async (req: Request, res: Response) => {
    const dbUser = await resolveUser(req);
    if (!dbUser) { res.status(401).json({ error: "Authentication required" }); return; }
    const { driverId, note } = req.body;
    if (!driverId) { res.status(400).json({ error: "driverId is required" }); return; }
    try {
          const existing = await db.select().from(savedDriversTable)
            .where(and(eq(savedDriversTable.shipperId, dbUser.id), eq(savedDriversTable.driverId, driverId)));
          if (existing.length > 0) { res.status(409).json({ error: "Driver already saved" }); return; }
          const id = crypto.randomUUID();
          const [saved] = await db.insert(savedDriversTable).values({ id, shipperId: dbUser.id, driverId, note: note || null }).returning();
          res.status(201).json(saved);
    } catch (err) {
          console.error("[saved-drivers POST] error:", err);
          res.status(500).json({ error: "Failed to save driver", detail: String(err) });
    }
});

router.delete("/saved-drivers/:driverId", async (req: Request, res: Response) => {
    const dbUser = await resolveUser(req);
    if (!dbUser) { res.status(401).json({ error: "Authentication required" }); return; }
    const driverId = req.params.driverId as string;
    try {
          await db.delete(savedDriversTable)
            .where(and(eq(savedDriversTable.shipperId, dbUser.id), eq(savedDriversTable.driverId, driverId)));
          res.json({ success: true });
    } catch (err) {
          console.error("[saved-drivers DELETE] error:", err);
          res.status(500).json({ error: "Failed to remove saved driver" });
    }
});

// Aliases under /users/saved-drivers for REST consistency
router.get("/users/saved-drivers", async (req: Request, res: Response) => {
    const dbUser = await resolveUser(req);
    if (!dbUser) { res.status(401).json({ error: "Authentication required" }); return; }
    try {
          const saved = await db
            .select(SELECT_DRIVER_FIELDS)
            .from(savedDriversTable)
            .leftJoin(usersTable, eq(savedDriversTable.driverId, usersTable.id))
            .where(eq(savedDriversTable.shipperId, dbUser.id));
          res.json({ savedDrivers: saved });
    } catch (err) {
          console.error("[users/saved-drivers GET] error:", err);
          res.status(500).json({ error: "Failed to fetch saved drivers" });
    }
});

router.post("/users/saved-drivers/:driverId", async (req: Request, res: Response) => {
    const dbUser = await resolveUser(req);
    if (!dbUser) { res.status(401).json({ error: "Authentication required" }); return; }
    const driverId = req.params.driverId as string;
    const { note } = req.body;
    try {
          const existing = await db.select().from(savedDriversTable)
            .where(and(eq(savedDriversTable.shipperId, dbUser.id), eq(savedDriversTable.driverId, driverId)));
          if (existing.length > 0) { res.status(409).json({ error: "Driver already saved" }); return; }
          const id = crypto.randomUUID();
          const [saved] = await db.insert(savedDriversTable).values({ id, shipperId: dbUser.id, driverId, note: note || null }).returning();
          res.status(201).json(saved);
    } catch (err) {
          console.error("[users/saved-drivers POST] error:", err);
          res.status(500).json({ error: "Failed to save driver", detail: String(err) });
    }
});

router.delete("/users/saved-drivers/:driverId", async (req: Request, res: Response) => {
    const dbUser = await resolveUser(req);
    if (!dbUser) { res.status(401).json({ error: "Authentication required" }); return; }
    const driverId = req.params.driverId as string;
    try {
          await db.delete(savedDriversTable)
            .where(and(eq(savedDriversTable.shipperId, dbUser.id), eq(savedDriversTable.driverId, driverId)));
          res.json({ success: true });
    } catch (err) {
          console.error("[users/saved-drivers DELETE] error:", err);
          res.status(500).json({ error: "Failed to remove saved driver" });
    }
});

export default router;
