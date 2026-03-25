import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const conditionPhotosTable = pgTable("condition_photos", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  bookingId: text("booking_id").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  phase: text("phase").notNull(),
  photoUrl: text("photo_url").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ConditionPhoto = typeof conditionPhotosTable.$inferSelect;
