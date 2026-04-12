import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { shipmentsTable, usersTable, bidsTable, lanePreferencesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createNotification } from "../lib/notify";

const router: IRouter = Router();

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

router.get("/shipments/my", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const dbUser = await getDbUser((req.user as any).id);
    if (!dbUser) {
      res.json({ shipments: [], total: 0 });
      return;
    }
    const rows = await db.select().from(shipmentsTable).where(eq(shipmentsTable.shipperId, dbUser.id)).orderBy(desc(shipmentsTable.createdAt));
    const enriched = await Promise.all(rows.map(async (s) => {
      const [shipper] = await db.select().from(usersTable).where(eq(usersTable.id, s.shipperId)).limit(1);
      return { ...s, shipper: shipper || null };
    }));
    res.json({ shipments: enriched, total: enriched.length });
  } catch (err) {
    console.error("GET /shipments/my error:", err);
    res.status(500).json({ error: "Failed to fetch shipments" });
  }
});

router.get("/shipments", async (req, res) => {
  const {
    status, originState, destinationState, vehicleType, transportType,
    vehicleCondition, search, minBudget, maxBudget,
  } = req.query;

  try {
    const conditions: any[] = [];
    // Exclude invite-only loads still within their exclusive window
    conditions.push(sql`(${shipmentsTable.inviteOnlyUntil} is null or ${shipmentsTable.inviteOnlyUntil} <= now())`);
    if (status) conditions.push(eq(shipmentsTable.status, status as string));
    if (originState) conditions.push(eq(shipmentsTable.originState, originState as string));
    if (destinationState) conditions.push(eq(shipmentsTable.destinationState, destinationState as string));
    if (vehicleType) conditions.push(eq(shipmentsTable.vehicleType, vehicleType as string));
    if (transportType) conditions.push(eq(shipmentsTable.transportType, transportType as string));
    if (vehicleCondition) conditions.push(eq(shipmentsTable.vehicleCondition, vehicleCondition as string));
    if (minBudget) conditions.push(sql`coalesce(${shipmentsTable.budgetMax}, ${shipmentsTable.budgetMin}) >= ${Number(minBudget)}`);
    if (maxBudget) conditions.push(sql`coalesce(${shipmentsTable.budgetMin}, ${shipmentsTable.budgetMax}) <= ${Number(maxBudget)}`);
    if (search) {
      const term = `%${(search as string).toLowerCase()}%`;
      conditions.push(sql`(
        lower(${shipmentsTable.vehicleMake}) like ${term} or
        lower(${shipmentsTable.vehicleModel}) like ${term} or
        lower(${shipmentsTable.originCity}) like ${term} or
        lower(${shipmentsTable.destinationCity}) like ${term}
      )`);
    }

    const rows = await db.select().from(shipmentsTable).where(and(...conditions)).orderBy(desc(shipmentsTable.createdAt));

    const enriched = await Promise.all(rows.map(async (s) => {
      const [shipper] = await db.select().from(usersTable).where(eq(usersTable.id, s.shipperId)).limit(1);
      return { ...s, shipper: shipper || null };
    }));
    res.json({ shipments: enriched, total: enriched.length });
  } catch (err) {
    console.error("GET /shipments error:", err);
    res.status(500).json({ error: "Failed to fetch shipments" });
  }
});

router.post("/shipments", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const dbUser = await getDbUser((req.user as any).id);
    if (!dbUser) {
      res.status(400).json({ error: "Profile not found. Please set up your profile first." });
      return;
    }
    const body = req.body;

    // Validate required fields
    const required = [
      "vehicleYear", "vehicleMake", "vehicleModel", "vehicleType",
      "vehicleCondition", "transportType",
      "originCity", "originState", "originZip",
      "destinationCity", "destinationState", "destinationZip",
    ];
    const missing = required.filter((f) => body[f] == null || body[f] === "");
    if (missing.length > 0) {
      res.status(400).json({ error: `Missing required fields: ${missing.join(", ")}` });
      return;
    }

    const vehicleYear = Number(body.vehicleYear);
    if (!Number.isInteger(vehicleYear) || vehicleYear < 1900 || vehicleYear > 2100) {
      res.status(400).json({ error: "vehicleYear must be a valid 4-digit year" });
      return;
    }

    const id = randomUUID();
    await db.insert(shipmentsTable).values({
      id,
      shipperId: dbUser.id,
      vehicleYear,
      vehicleMake: body.vehicleMake,
      vehicleModel: body.vehicleModel,
      vehicleType: body.vehicleType,
      vehicleCondition: body.vehicleCondition,
      vin: body.vin || null,
      transportType: body.transportType,
      serviceType: body.serviceType || null,
      originAddress: body.originAddress || null,
      originCity: body.originCity,
      originState: body.originState,
      originZip: body.originZip,
      destinationAddress: body.destinationAddress || null,
      destinationCity: body.destinationCity,
      destinationState: body.destinationState,
      destinationZip: body.destinationZip,
      pickupDateFrom: body.pickupDateFrom || null,
      pickupDateTo: body.pickupDateTo || null,
      budgetMin: body.budgetMin != null ? Number(body.budgetMin) : null,
      budgetMax: body.budgetMax != null ? Number(body.budgetMax) : null,
      notes: body.notes || null,
      pickupLocationType: body.pickupLocationType || null,
      deliveryLocationType: body.deliveryLocationType || null,
      status: "open",
    });
    const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);

    // Notify drivers who have matching lane preferences
    notifyMatchingDrivers(shipment!).catch(() => {});

    res.status(201).json(shipment);
  } catch (err) {
    console.error("POST /shipments error:", err);
    res.status(500).json({ error: "Failed to create shipment" });
  }
});

async function notifyMatchingDrivers(shipment: typeof shipmentsTable.$inferSelect) {
  if (!shipment) return;
  // Find driver lane prefs matching origin → destination state
  const matches = await db.select().from(lanePreferencesTable)
    .where(
      and(
        eq(lanePreferencesTable.role, "driver"),
        eq(lanePreferencesTable.originState, shipment.originState),
        eq(lanePreferencesTable.destinationState, shipment.destinationState),
        eq(lanePreferencesTable.isActive, true),
      )
    );

  const vehicleLabel = `${shipment.vehicleYear} ${shipment.vehicleMake} ${shipment.vehicleModel}`;
  for (const pref of matches) {
    await createNotification({
      userId: pref.userId,
      type: "load_match",
      title: "New load on your lane",
      body: `${vehicleLabel} — ${shipment.originCity}, ${shipment.originState} → ${shipment.destinationCity}, ${shipment.destinationState}${shipment.budgetMax ? ` · up to $${shipment.budgetMax}` : ""}`,
      linkPath: `/shipments/${shipment.id}`,
    });
  }
}

router.get("/shipments/:shipmentId", async (req, res) => {
  const { shipmentId } = req.params;
  try {
    const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, shipmentId)).limit(1);
    if (!shipment) {
      res.status(404).json({ error: "Shipment not found" });
      return;
    }
    const [shipper] = await db.select().from(usersTable).where(eq(usersTable.id, shipment.shipperId)).limit(1);
    res.json({ ...shipment, shipper: shipper || null });
  } catch (err) {
    console.error("GET /shipments/:id error:", err);
    res.status(500).json({ error: "Failed to fetch shipment" });
  }
});

router.put("/shipments/:shipmentId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const dbUser = await getDbUser((req.user as any).id);
    const { shipmentId } = req.params;
    const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, shipmentId)).limit(1);
    if (!shipment) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (shipment.shipperId !== dbUser?.id && dbUser?.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const body = req.body;
    const updateData: any = { updatedAt: new Date() };
    const allowed = ["notes","budgetMin","budgetMax","pickupDateFrom","pickupDateTo","status"];
    for (const k of allowed) {
      if (body[k] !== undefined) updateData[k] = body[k];
    }
    await db.update(shipmentsTable).set(updateData).where(eq(shipmentsTable.id, shipmentId));
    const [updated] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, shipmentId)).limit(1);
    res.json(updated);
  } catch (err) {
    console.error("PUT /shipments/:id error:", err);
    res.status(500).json({ error: "Failed to update shipment" });
  }
});

router.delete("/shipments/:shipmentId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const dbUser = await getDbUser((req.user as any).id);
    const { shipmentId } = req.params;
    const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, shipmentId)).limit(1);
    if (!shipment) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (shipment.shipperId !== dbUser?.id && dbUser?.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await db.update(shipmentsTable).set({ status: "cancelled", updatedAt: new Date() }).where(eq(shipmentsTable.id, shipmentId));
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /shipments/:id error:", err);
    res.status(500).json({ error: "Failed to cancel shipment" });
  }
});

// Invite saved drivers for a 2-hour exclusive first-look window
router.post("/shipments/:shipmentId/invite-drivers", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const dbUser = await getDbUser((req.user as any).id);
    if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }
    const { shipmentId } = req.params;
    const { driverIds } = req.body as { driverIds: string[] };
    if (!Array.isArray(driverIds) || driverIds.length === 0) { res.status(400).json({ error: "driverIds required" }); return; }

    const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, shipmentId)).limit(1);
    if (!shipment) { res.status(404).json({ error: "Not found" }); return; }
    if (shipment.shipperId !== dbUser.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const inviteOnlyUntil = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours
    await db.update(shipmentsTable).set({ inviteOnlyUntil, updatedAt: new Date() }).where(eq(shipmentsTable.id, shipmentId));

    const vehicleLabel = `${shipment.vehicleYear} ${shipment.vehicleMake} ${shipment.vehicleModel}`;
    for (const driverId of driverIds) {
      await createNotification({
        userId: driverId,
        type: "driver_invite",
        title: "⭐ First look — new load from a shipper you've worked with",
        body: `${vehicleLabel} — ${shipment.originCity}, ${shipment.originState} → ${shipment.destinationCity}, ${shipment.destinationState}. You have 2 hours to bid before it goes public.`,
        linkPath: `/shipments/${shipmentId}`,
      });
    }

    res.json({ success: true, inviteOnlyUntil, invitedCount: driverIds.length });
  } catch (err) {
    console.error("POST /shipments/:id/invite-drivers error:", err);
    res.status(500).json({ error: "Failed to invite drivers" });
  }
});

export default router;
