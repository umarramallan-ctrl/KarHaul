import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const trackingCheckpointsTable = pgTable("tracking_checkpoints", {
  id: text("id").primaryKey(),
  bookingId: text("booking_id").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  city: text("city"),
  state: text("state"),
  milestone: text("milestone").notNull(),
  notes: text("notes"),
  estimatedArrival: text("estimated_arrival"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type TrackingCheckpoint = typeof trackingCheckpointsTable.$inferSelect;
