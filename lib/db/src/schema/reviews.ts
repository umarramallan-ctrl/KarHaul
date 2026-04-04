import { pgTable, text, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewsTable = pgTable("reviews", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull(),
  reviewerId: text("reviewer_id").notNull(),
  revieweeId: text("reviewee_id").notNull(),
  reviewerRole: text("reviewer_role"),
  rating: real("rating").notNull(),
  // Shipper → Driver criteria
  timelyPickup: real("timely_pickup"),
  deliveryOnTime: real("delivery_on_time"),
  vehicleCondition: real("vehicle_condition"),
  communication: real("communication"),
  professionalism: real("professionalism"),
  // Driver → Shipper criteria
  timelyPayment: real("timely_payment"),
  accurateVehicleDescription: real("accurate_vehicle_description"),
  easyAccess: real("easy_access"),
  comment: text("comment"),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
