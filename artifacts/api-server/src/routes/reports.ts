import { Router, type IRouter, type Request, type Response } from "express";
import { db, reportsTable, usersTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { randomUUID } from "crypto";
import { createNotification } from "../lib/notify";
import Anthropic from "@anthropic-ai/sdk";

const router: IRouter = Router();

const REPORT_CATEGORIES: Record<string, string> = {
  fraud_scam: "Fraud / Scam",
  fake_identity: "Fake Identity",
  off_platform: "Off-Platform Solicitation",
  abusive: "Abusive Behavior",
  suspicious: "Suspicious Activity",
};

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

async function getAdminUsers() {
  return db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin"));
}

async function scoreReportWithAI(
  category: string,
  description: string | undefined,
  reportedUser: typeof usersTable.$inferSelect,
  priorReportCount: number,
): Promise<{ riskScore: "low" | "medium" | "high"; reasoning: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { riskScore: "medium", reasoning: "AI unavailable — flagged for manual review." };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const accountAgeDays = Math.floor((Date.now() - new Date(reportedUser.createdAt).getTime()) / 86400000);

  const prompt = `You are a trust-and-safety analyst for KarHaul, a vehicle transport marketplace.

A user has been reported. Assess the risk level.

Report details:
- Category: ${REPORT_CATEGORIES[category] || category}
- Description: ${description || "(no description provided)"}

Reported account profile:
- Account age: ${accountAgeDays} days
- Completed jobs: ${reportedUser.completedJobs}
- Average rating: ${reportedUser.averageRating?.toFixed(1) || "N/A"} (${reportedUser.totalReviews} reviews)
- Already suspended: ${reportedUser.isSuspended}
- Previous reports against this account: ${priorReportCount}

Risk levels:
- high: Immediate threat; clear fraud, fake identity, or pattern of abuse. Auto-suspend recommended.
- medium: Concerning but needs human review. Flag the account.
- low: Likely a misunderstanding or minor infraction.

Respond with ONLY valid JSON: {"riskScore": "low|medium|high", "reasoning": "one sentence"}`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = (message.content[0] as any).text?.trim() || "";
    const match = text.match(/\{[^}]+\}/s);
    if (!match) return { riskScore: "medium", reasoning: "AI parse error — flagged for review." };
    const parsed = JSON.parse(match[0]);
    const score = ["low", "medium", "high"].includes(parsed.riskScore) ? parsed.riskScore : "medium";
    return { riskScore: score as "low" | "medium" | "high", reasoning: parsed.reasoning || "" };
  } catch {
    return { riskScore: "medium", reasoning: "AI error — flagged for manual review." };
  }
}

router.post("/reports", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Authentication required" }); return; }
  const reporter = await getDbUser((req.user as any).id);
  if (!reporter) { res.status(401).json({ error: "User not found" }); return; }

  const { reportedUserId, category, description } = req.body;
  if (!reportedUserId || !category) { res.status(400).json({ error: "reportedUserId and category are required" }); return; }
  if (!REPORT_CATEGORIES[category]) { res.status(400).json({ error: "Invalid category" }); return; }
  if (reportedUserId === reporter.id) { res.status(400).json({ error: "Cannot report yourself" }); return; }

  const [reportedUser] = await db.select().from(usersTable).where(eq(usersTable.id, reportedUserId)).limit(1);
  if (!reportedUser) { res.status(404).json({ error: "Reported user not found" }); return; }

  // Count prior reports against this user
  const priorReports = await db.select().from(reportsTable).where(eq(reportsTable.reportedUserId, reportedUserId));
  const priorReportCount = priorReports.length;

  // AI risk assessment
  const { riskScore, reasoning } = await scoreReportWithAI(category, description, reportedUser, priorReportCount);

  // Save report
  const id = randomUUID();
  const [report] = await db.insert(reportsTable).values({
    id, reporterId: reporter.id, reportedUserId, category,
    description: description || null,
    riskScore,
    aiNotes: reasoning,
    status: riskScore === "high" ? "action_taken" : "pending",
  }).returning();

  const admins = await getAdminUsers();
  const categoryLabel = REPORT_CATEGORIES[category];
  const reporterName = `${reporter.firstName || ""} ${reporter.lastName || ""}`.trim() || "A user";
  const reportedName = `${reportedUser.firstName || ""} ${reportedUser.lastName || ""}`.trim() || "a user";

  if (riskScore === "high") {
    // Auto-suspend account
    await db.update(usersTable).set({ isSuspended: true, updatedAt: new Date() }).where(eq(usersTable.id, reportedUserId));

    // Notify all admins
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: "user_suspended",
        title: `🚨 Account auto-suspended: ${reportedName}`,
        body: `High-risk report (${categoryLabel}) from ${reporterName}. AI: ${reasoning}`,
        linkPath: `/admin`,
      });
    }
  } else if (riskScore === "medium") {
    // Flag for manual review — notify admins
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: "report_submitted",
        title: `⚠️ Report flagged for review: ${reportedName}`,
        body: `Medium-risk report (${categoryLabel}) from ${reporterName}. AI: ${reasoning}`,
        linkPath: `/admin`,
      });
    }
  }

  res.status(201).json({
    id: report.id,
    riskScore,
    message: riskScore === "high"
      ? "Report submitted. The account has been suspended pending review."
      : riskScore === "medium"
      ? "Report submitted and flagged for admin review."
      : "Report submitted. We'll review it shortly.",
  });
});

router.get("/reports", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser || dbUser.role !== "admin") { res.status(403).json({ error: "Admin only" }); return; }

  const reports = await db.select().from(reportsTable).orderBy(reportsTable.createdAt);
  const enriched = await Promise.all(reports.map(async (r) => {
    const [reporter] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName }).from(usersTable).where(eq(usersTable.id, r.reporterId)).limit(1);
    const [reported] = await db.select({ firstName: usersTable.firstName, lastName: usersTable.lastName, isSuspended: usersTable.isSuspended }).from(usersTable).where(eq(usersTable.id, r.reportedUserId)).limit(1);
    return { ...r, reporterName: reporter ? `${reporter.firstName} ${reporter.lastName}`.trim() : "Unknown", reportedName: reported ? `${reported.firstName} ${reported.lastName}`.trim() : "Unknown", reportedSuspended: reported?.isSuspended ?? false };
  }));
  res.json({ reports: enriched });
});

export default router;
