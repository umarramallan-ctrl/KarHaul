import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const savedDriversTable = pgTable("saved_drivers", {
  id: text("id").primaryKey().default("gen_random_uuid()"),
  shipperId: text("shipper_id").notNull(),
  driverId: text("driver_id").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SavedDriver = typeof savedDriversTable.$inferSelect;
