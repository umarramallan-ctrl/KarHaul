import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, reviewsTable, bookingsTable } from "@workspace/db";
import { eq, desc, and, ne, or, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.get("/users/profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = (req.user as any).id;
  let user = await db.select().from(usersTable).where(eq(usersTable.authId, userId)).limit(1);
  if (user.length === 0) {
    const authUser = req.user as any;
    const newId = randomUUID();
    await db.insert(usersTable).values({
      id: newId,
      authId: userId,
      firstName: authUser.firstName || "",
      lastName: authUser.lastName || "",
      profileImageUrl: authUser.profileImage || null,
      role: "shipper",
    });
    user = await db.select().from(usersTable).where(eq(usersTable.authId, userId)).limit(1);
  }
  res.json(user[0]);
});

router.put("/users/profile", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const userId = (req.user as any).id;
  const body = req.body;
  const updateData: any = {};
  const allowed = ["firstName","lastName","phone","role","bio","dotNumber","mcNumber","insuranceProvider","insurancePolicyNumber","truckType","truckCapacity","termsAccepted"];
  for (const k of allowed) {
    if (body[k] !== undefined) updateData[k] = body[k];
  }
  if (body.termsAccepted === true) {
    updateData.termsAcceptedAt = new Date();
  }
  updateData.updatedAt = new Date();

  // Check for duplicate phone
  if (body.phone) {
    const existing = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.phone, body.phone), ne(usersTable.authId, userId))).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this phone number already exists" });
      return;
    }
  }

  let user = await db.select().from(usersTable).where(eq(usersTable.authId, userId)).limit(1);
  if (user.length === 0) {
    const authUser = req.user as any;
    const newId = randomUUID();
    await db.insert(usersTable).values({
      id: newId,
      authId: userId,
      firstName: authUser.firstName || "",
      lastName: authUser.lastName || "",
      profileImageUrl: authUser.profileImage || null,
      role: "shipper",
      ...updateData,
    });
    user = await db.select().from(usersTable).where(eq(usersTable.authId, userId)).limit(1);
    res.json(user[0]);
    return;
  }
  await db.update(usersTable).set(updateData).where(eq(usersTable.authId, userId));
  user = await db.select().from(usersTable).where(eq(usersTable.authId, userId)).limit(1);
  res.json(user[0]);
});

// POST /users/account/delete-request — request account deletion (30-day grace period)
router.post("/users/account/delete-request", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const authId = (req.user as any).id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  // Block if active bookings exist
  const activeStatuses = ["confirmed", "picked_up", "in_transit"];
  const activeBookings = await db
    .select({ id: bookingsTable.id })
    .from(bookingsTable)
    .where(
      and(
        or(eq(bookingsTable.driverId, user.id), eq(bookingsTable.shipperId, user.id)),
        inArray(bookingsTable.status, activeStatuses)
      )
    )
    .limit(1);

  if (activeBookings.length > 0) {
    res.status(409).json({ error: "Cannot delete account with active bookings. Complete or cancel all active shipments first." });
    return;
  }

  const now = new Date();
  await db.update(usersTable).set({
    isDeactivated: true,
    deletionRequestedAt: now,
    updatedAt: now,
  }).where(eq(usersTable.authId, authId));

  res.json({ message: "Account deactivated. Personal data will be purged in 30 days. Transaction and BOL records are retained.", deletionRequestedAt: now });
});

// DELETE /users/account/delete-cancel — cancel a pending deletion (within 30 days)
router.delete("/users/account/delete-cancel", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const authId = (req.user as any).id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (!user.deletionRequestedAt) {
    res.status(400).json({ error: "No pending deletion request." });
    return;
  }

  const daysElapsed = (Date.now() - user.deletionRequestedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysElapsed >= 30) {
    res.status(410).json({ error: "Grace period has expired. Account data has already been purged." });
    return;
  }

  await db.update(usersTable).set({
    isDeactivated: false,
    deletionRequestedAt: null,
    updatedAt: new Date(),
  }).where(eq(usersTable.authId, authId));

  res.json({ message: "Account deletion cancelled. Your account has been restored." });
});

router.get("/users/:userId", async (req, res) => {
  const { userId } = req.params;
  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (users.length === 0) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  // Strip sensitive fields before returning public profile
  const { totpSecret, authId, email, phone, insurancePolicyNumber, ...publicUser } = users[0];
  res.json(publicUser);
});

export default router;
