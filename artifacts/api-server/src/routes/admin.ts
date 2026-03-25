import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable, shipmentsTable, bookingsTable } from "@workspace/db";
import { eq, count, desc } from "drizzle-orm";

const router: IRouter = Router();

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

async function requireAdmin(req: any, res: any): Promise<boolean> {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser || dbUser.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return false;
  }
  return true;
}

router.get("/admin/users", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { role } = req.query;
  const users = role
    ? await db.select().from(usersTable).where(eq(usersTable.role, role as string)).orderBy(desc(usersTable.createdAt))
    : await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json({ users, total: users.length });
});

router.get("/admin/shipments", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { status } = req.query;
  const shipments = status
    ? await db.select().from(shipmentsTable).where(eq(shipmentsTable.status, status as string)).orderBy(desc(shipmentsTable.createdAt))
    : await db.select().from(shipmentsTable).orderBy(desc(shipmentsTable.createdAt));
  res.json({ shipments, total: shipments.length });
});

router.post("/admin/users/:userId/suspend", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { userId } = req.params;
  await db.update(usersTable).set({ isSuspended: true }).where(eq(usersTable.id, userId));
  res.json({ success: true });
});

router.post("/admin/users/:userId/verify", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const { userId } = req.params;
  await db.update(usersTable).set({ isVerified: true }).where(eq(usersTable.id, userId));
  res.json({ success: true });
});

router.get("/admin/stats", async (req, res) => {
  if (!await requireAdmin(req, res)) return;
  const allUsers = await db.select().from(usersTable);
  const allShipments = await db.select().from(shipmentsTable);
  const allBookings = await db.select().from(bookingsTable);
  const totalUsers = allUsers.length;
  const totalShippers = allUsers.filter(u => u.role === "shipper" || u.role === "both").length;
  const totalDrivers = allUsers.filter(u => u.role === "driver" || u.role === "both").length;
  const totalShipments = allShipments.length;
  const openShipments = allShipments.filter(s => s.status === "open").length;
  const completedShipments = allShipments.filter(s => s.status === "delivered").length;
  const totalBookings = allBookings.length;
  const totalRevenue = allBookings.reduce((sum, b) => sum + (b.agreedPrice || 0), 0);
  res.json({ totalUsers, totalShippers, totalDrivers, totalShipments, openShipments, completedShipments, totalBookings, totalRevenue });
});

export default router;
