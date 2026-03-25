import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const smsCodesTable = pgTable("sms_codes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  purpose: text("purpose").notNull().default("verify"),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SmsCode = typeof smsCodesTable.$inferSelect;
