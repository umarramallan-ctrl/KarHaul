import { Router, type IRouter } from "express";
import { db, lanePreferencesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const FREE_TIER_LIMIT = 3;

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

router.get("/lane-preferences", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.json({ preferences: [] }); return; }

  const prefs = await db.select().from(lanePreferencesTable)
    .where(and(eq(lanePreferencesTable.userId, dbUser.id), eq(lanePreferencesTable.isActive, true)));
  res.json({ preferences: prefs, limit: dbUser.isPremium ? null : FREE_TIER_LIMIT });
});

router.post("/lane-preferences", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }

  // Enforce free tier limit
  if (!dbUser.isPremium) {
    const existing = await db.select().from(lanePreferencesTable)
      .where(and(eq(lanePreferencesTable.userId, dbUser.id), eq(lanePreferencesTable.isActive, true)));
    if (existing.length >= FREE_TIER_LIMIT) {
      res.status(403).json({
        error: `Free accounts are limited to ${FREE_TIER_LIMIT} lane preferences. Upgrade to Pro for unlimited lanes.`,
        code: "PREMIUM_REQUIRED",
      });
      return;
    }
  }

  const { originState, destinationState, role } = req.body;
  if (!originState || !destinationState || !role) {
    res.status(400).json({ error: "originState, destinationState, and role are required" });
    return;
  }

  // Prevent duplicates
  const [existing] = await db.select().from(lanePreferencesTable)
    .where(and(
      eq(lanePreferencesTable.userId, dbUser.id),
      eq(lanePreferencesTable.originState, originState),
      eq(lanePreferencesTable.destinationState, destinationState),
      eq(lanePreferencesTable.role, role),
    )).limit(1);
  if (existing) {
    // Re-activate if deactivated
    await db.update(lanePreferencesTable)
      .set({ isActive: true })
      .where(eq(lanePreferencesTable.id, existing.id));
    res.status(200).json(existing);
    return;
  }

  const [pref] = await db.insert(lanePreferencesTable).values({
    userId: dbUser.id,
    role,
    originState,
    destinationState,
    isActive: true,
  }).returning();

  res.status(201).json(pref);
});

router.delete("/lane-preferences/:prefId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);

  const [pref] = await db.select().from(lanePreferencesTable)
    .where(eq(lanePreferencesTable.id, req.params.prefId)).limit(1);
  if (!pref) { res.status(404).json({ error: "Not found" }); return; }
  if (pref.userId !== dbUser?.id) { res.status(403).json({ error: "Forbidden" }); return; }

  await db.update(lanePreferencesTable)
    .set({ isActive: false })
    .where(eq(lanePreferencesTable.id, pref.id));

  res.json({ success: true });
});

export default router;
