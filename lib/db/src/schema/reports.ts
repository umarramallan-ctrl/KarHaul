import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const reportsTable = pgTable("reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").notNull(),
  reportedUserId: text("reported_user_id").notNull(),
  category: text("category").notNull(), // fraud_scam | fake_identity | off_platform | abusive | suspicious
  description: text("description"),
  riskScore: text("risk_score"), // low | medium | high
  aiNotes: text("ai_notes"),
  status: text("status").notNull().default("pending"), // pending | reviewed | dismissed | action_taken
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Report = typeof reportsTable.$inferSelect;
