import { Router, type IRouter, type Request, type Response } from "express";
import { db, driverRoutesTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router: IRouter = Router();

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

router.get("/driver-routes", async (req: Request, res: Response) => {
  try {
    const { originState, destinationState, transportType, activeOnly } = req.query;
    let conditions = [eq(driverRoutesTable.isActive, true)];
    if (originState) conditions.push(eq(sql`upper(${driverRoutesTable.originState})`, String(originState).toUpperCase()));
    if (destinationState) conditions.push(eq(sql`upper(${driverRoutesTable.destinationState})`, String(destinationState).toUpperCase()));
    if (transportType) conditions.push(eq(driverRoutesTable.transportType, String(transportType)));

    const routes = await db
      .select({
        id: driverRoutesTable.id,
        driverId: driverRoutesTable.driverId,
        originCity: driverRoutesTable.originCity,
        originState: driverRoutesTable.originState,
        destinationCity: driverRoutesTable.destinationCity,
        destinationState: driverRoutesTable.destinationState,
        departureDateFrom: driverRoutesTable.departureDateFrom,
        departureDateTo: driverRoutesTable.departureDateTo,
        truckCapacity: driverRoutesTable.truckCapacity,
        availableSpots: driverRoutesTable.availableSpots,
        transportType: driverRoutesTable.transportType,
        pricePerVehicle: driverRoutesTable.pricePerVehicle,
        notes: driverRoutesTable.notes,
        isActive: driverRoutesTable.isActive,
        createdAt: driverRoutesTable.createdAt,
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
        },
      })
      .from(driverRoutesTable)
      .leftJoin(usersTable, eq(driverRoutesTable.driverId, usersTable.id))
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(sql`${driverRoutesTable.departureDateFrom} asc`);

    res.json({ routes });
  } catch (err) {
    req.log?.error({ err }, "Failed to list driver routes");
    res.status(500).json({ error: "Failed to list driver routes" });
  }
});

router.post("/driver-routes", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
  const authId = req.user!.id;
  try {
    const dbUser = await getDbUser(authId);
    if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }
    const userId = dbUser.id;
    const { originCity, originState, destinationCity, destinationState, departureDateFrom, departureDateTo, truckCapacity, availableSpots, transportType, pricePerVehicle, notes } = req.body;
    if (!originCity || !originState || !destinationCity || !destinationState || !departureDateFrom || !departureDateTo) {
      res.status(400).json({ error: "Missing required fields" }); return;
    }
    const id = crypto.randomUUID();
    const [route] = await db.insert(driverRoutesTable).values({
      id, driverId: userId, originCity, originState, destinationCity, destinationState,
      departureDateFrom, departureDateTo,
      truckCapacity: Number(truckCapacity) || 1, availableSpots: Number(availableSpots) || 1,
      transportType: transportType || "open",
      pricePerVehicle: pricePerVehicle != null && pricePerVehicle !== "" ? Number(pricePerVehicle) : null,
      notes: notes || null, isActive: true,
    }).returning();
    res.status(201).json(route);
  } catch (err) {
    req.log?.error({ err }, "Failed to create driver route");
    res.status(500).json({ error: "Failed to create driver route" });
  }
});

router.patch("/driver-routes/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
  const authId = req.user!.id;
  const id = req.params.id as string;
  try {
    const dbUser = await getDbUser(authId);
    if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }
    const [existing] = await db.select().from(driverRoutesTable).where(eq(driverRoutesTable.id, id));
    if (!existing || existing.driverId !== dbUser.id) { res.status(403).json({ error: "Not authorized" }); return; }
    const { availableSpots, isActive, notes, pricePerVehicle } = req.body;
    const [updated] = await db.update(driverRoutesTable)
      .set({ availableSpots, isActive, notes, pricePerVehicle, updatedAt: new Date() })
      .where(eq(driverRoutesTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update driver route" });
  }
});

router.delete("/driver-routes/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
  const authId = req.user!.id;
  const id = req.params.id as string;
  try {
    const dbUser = await getDbUser(authId);
    if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }
    const [existing] = await db.select().from(driverRoutesTable).where(eq(driverRoutesTable.id, id));
    if (!existing || existing.driverId !== dbUser.id) { res.status(403).json({ error: "Not authorized" }); return; }
    await db.delete(driverRoutesTable).where(eq(driverRoutesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete driver route" });
  }
});

export default router;
