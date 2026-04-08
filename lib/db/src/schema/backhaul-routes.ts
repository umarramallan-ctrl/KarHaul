import { pgTable, text, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const backhaulRoutesTable = pgTable("backhaul_routes", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: text("driver_id").notNull(),
  // The completed booking this backhaul originates from (optional)
  bookingId: text("booking_id"),
  originCity: text("origin_city").notNull(),
  originState: text("origin_state").notNull(),
  destinationCity: text("destination_city").notNull(),
  destinationState: text("destination_state").notNull(),
  departureDateFrom: text("departure_date_from").notNull(),
  departureDateTo: text("departure_date_to").notNull(),
  availableSpots: integer("available_spots").notNull().default(1),
  truckCapacity: integer("truck_capacity").notNull().default(1),
  transportType: text("transport_type").notNull().default("open"),
  pricePerVehicle: real("price_per_vehicle"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type BackhaulRoute = typeof backhaulRoutesTable.$inferSelect;
export type InsertBackhaulRoute = typeof backhaulRoutesTable.$inferInsert;
