import { Router, type IRouter } from "express";
import { db, backhaulRoutesTable, usersTable, lanePreferencesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { createNotification } from "../lib/notify";

const router: IRouter = Router();

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

// List active backhaul routes (public)
router.get("/backhaul", async (req, res) => {
  const { originState, destinationState } = req.query;
  const conditions: any[] = [eq(backhaulRoutesTable.isActive, true)];
  if (originState) conditions.push(eq(backhaulRoutesTable.originState, originState as string));
  if (destinationState) conditions.push(eq(backhaulRoutesTable.destinationState, destinationState as string));

  const routes = await db.select().from(backhaulRoutesTable)
    .where(and(...conditions))
    .orderBy(desc(backhaulRoutesTable.createdAt));

  const enriched = await Promise.all(routes.map(async (r) => {
    const [driver] = await db.select().from(usersTable).where(eq(usersTable.id, r.driverId)).limit(1);
    return { ...r, driver: driver || null };
  }));
  res.json({ routes: enriched, total: enriched.length });
});

// Get driver's own backhaul routes
router.get("/backhaul/my", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.json({ routes: [], total: 0 }); return; }

  const routes = await db.select().from(backhaulRoutesTable)
    .where(eq(backhaulRoutesTable.driverId, dbUser.id))
    .orderBy(desc(backhaulRoutesTable.createdAt));
  res.json({ routes, total: routes.length });
});

// Post a backhaul route
router.post("/backhaul", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }

  const body = req.body;
  const [route] = await db.insert(backhaulRoutesTable).values({
    driverId: dbUser.id,
    bookingId: body.bookingId || null,
    originCity: body.originCity,
    originState: body.originState,
    destinationCity: body.destinationCity,
    destinationState: body.destinationState,
    departureDateFrom: body.departureDateFrom,
    departureDateTo: body.departureDateTo,
    availableSpots: body.availableSpots ?? 1,
    truckCapacity: body.truckCapacity ?? 1,
    transportType: body.transportType ?? "open",
    pricePerVehicle: body.pricePerVehicle || null,
    notes: body.notes || null,
    isActive: true,
  }).returning();

  // Notify shippers who have matching return lane preferences
  notifyMatchingShippers(route, dbUser).catch(() => {});

  res.status(201).json(route);
});

// Update / deactivate a backhaul route
router.put("/backhaul/:routeId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  const [route] = await db.select().from(backhaulRoutesTable)
    .where(eq(backhaulRoutesTable.id, req.params.routeId)).limit(1);
  if (!route) { res.status(404).json({ error: "Not found" }); return; }
  if (route.driverId !== dbUser?.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const allowed = ["isActive", "pricePerVehicle", "availableSpots", "notes", "departureDateFrom", "departureDateTo"];
  const update: any = { updatedAt: new Date() };
  for (const k of allowed) {
    if (req.body[k] !== undefined) update[k] = req.body[k];
  }
  await db.update(backhaulRoutesTable).set(update).where(eq(backhaulRoutesTable.id, route.id));
  const [updated] = await db.select().from(backhaulRoutesTable)
    .where(eq(backhaulRoutesTable.id, route.id)).limit(1);
  res.json(updated);
});

async function notifyMatchingShippers(
  route: typeof backhaulRoutesTable.$inferSelect,
  driver: typeof usersTable.$inferSelect,
) {
  // Find shippers with return lane prefs matching origin → destination
  const matches = await db.select().from(lanePreferencesTable)
    .where(
      and(
        eq(lanePreferencesTable.role, "shipper"),
        eq(lanePreferencesTable.originState, route.originState),
        eq(lanePreferencesTable.destinationState, route.destinationState),
        eq(lanePreferencesTable.isActive, true),
      )
    );

  const driverName = `${driver.firstName ?? ""} ${driver.lastName ?? ""}`.trim() || "A driver";
  for (const pref of matches) {
    await createNotification({
      userId: pref.userId,
      type: "backhaul_match",
      title: "Backhaul available on your lane",
      body: `${driverName} has capacity returning ${route.originCity}, ${route.originState} → ${route.destinationCity}, ${route.destinationState}${route.pricePerVehicle ? ` · $${route.pricePerVehicle}/vehicle` : ""} (discounted backhaul rate)`,
      linkPath: `/backhaul`,
    });
  }
}

export default router;
