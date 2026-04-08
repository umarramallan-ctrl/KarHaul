import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Stores individual lane preferences for both drivers and shippers.
// role = 'driver' means driver wants loads from originState → destinationState
// role = 'shipper' means shipper wants return/backhaul on originState → destinationState
export const lanePreferencesTable = pgTable("lane_preferences", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  role: text("role").notNull(), // driver | shipper
  originState: text("origin_state").notNull(),
  destinationState: text("destination_state").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LanePreference = typeof lanePreferencesTable.$inferSelect;
export type InsertLanePreference = typeof lanePreferencesTable.$inferInsert;
