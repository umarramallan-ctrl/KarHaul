import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, reviewsTable } from "@workspace/db";
import { eq, desc, and, ne } from "drizzle-orm";
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
