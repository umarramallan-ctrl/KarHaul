import { pgTable, text, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  authId: text("auth_id").unique(),
  email: text("email"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  role: text("role").notNull().default("shipper"),
  profileImageUrl: text("profile_image_url"),
  bio: text("bio"),
  dotNumber: text("dot_number"),
  mcNumber: text("mc_number"),
  insuranceProvider: text("insurance_provider"),
  insurancePolicyNumber: text("insurance_policy_number"),
  truckType: text("truck_type"),
  truckCapacity: real("truck_capacity"),
  isVerified: boolean("is_verified").notNull().default(false),
  isSuspended: boolean("is_suspended").notNull().default(false),
  isPremium: boolean("is_premium").notNull().default(false),
  averageRating: real("average_rating").notNull().default(0),
  totalReviews: integer("total_reviews").notNull().default(0),
  completedJobs: integer("completed_jobs").notNull().default(0),
  termsAccepted: boolean("terms_accepted").notNull().default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  smsOtpEnabled: boolean("sms_otp_enabled").notNull().default(false),
  twoFaMethod: text("two_fa_method").notNull().default("none"),
  // Stripe Connect fields
  stripeCustomerId: text("stripe_customer_id"),
  stripeAccountId: text("stripe_account_id"),       // Express Connect account (drivers)
  stripeAccountStatus: text("stripe_account_status"), // pending | active | restricted
  // Push notification token (Expo push token for mobile)
  pushToken: text("push_token"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
