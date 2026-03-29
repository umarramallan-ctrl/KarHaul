import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { shipmentsTable, usersTable, bidsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

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
});

router.get("/shipments", async (req, res) => {
  const {
    status, originState, destinationState, vehicleType, transportType,
    vehicleCondition, search, minBudget, maxBudget,
  } = req.query;

  const conditions: any[] = [];
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

  const rows = conditions.length > 0
    ? await db.select().from(shipmentsTable).where(and(...conditions)).orderBy(desc(shipmentsTable.createdAt))
    : await db.select().from(shipmentsTable).orderBy(desc(shipmentsTable.createdAt));

  const enriched = await Promise.all(rows.map(async (s) => {
    const [shipper] = await db.select().from(usersTable).where(eq(usersTable.id, s.shipperId)).limit(1);
    return { ...s, shipper: shipper || null };
  }));
  res.json({ shipments: enriched, total: enriched.length });
});

router.post("/shipments", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) {
    res.status(400).json({ error: "Profile not found. Please set up your profile first." });
    return;
  }
  const body = req.body;
  const id = randomUUID();
  await db.insert(shipmentsTable).values({
    id,
    shipperId: dbUser.id,
    vehicleYear: body.vehicleYear,
    vehicleMake: body.vehicleMake,
    vehicleModel: body.vehicleModel,
    vehicleType: body.vehicleType,
    vehicleCondition: body.vehicleCondition,
    vin: body.vin || null,
    transportType: body.transportType,
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
    budgetMin: body.budgetMin || null,
    budgetMax: body.budgetMax || null,
    notes: body.notes || null,
    pickupLocationType: body.pickupLocationType || null,
    deliveryLocationType: body.deliveryLocationType || null,
    status: "open",
  });
  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  res.status(201).json(shipment);
});

router.get("/shipments/:shipmentId", async (req, res) => {
  const { shipmentId } = req.params;
  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, shipmentId)).limit(1);
  if (!shipment) {
    res.status(404).json({ error: "Shipment not found" });
    return;
  }
  const [shipper] = await db.select().from(usersTable).where(eq(usersTable.id, shipment.shipperId)).limit(1);
  res.json({ ...shipment, shipper: shipper || null });
});

router.put("/shipments/:shipmentId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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
});

router.delete("/shipments/:shipmentId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
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
});

export default router;
