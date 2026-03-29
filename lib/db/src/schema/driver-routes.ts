import { pgTable, text, real, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const driverRoutesTable = pgTable("driver_routes", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: text("driver_id").notNull(),
  originCity: text("origin_city").notNull(),
  originState: text("origin_state").notNull(),
  destinationCity: text("destination_city").notNull(),
  destinationState: text("destination_state").notNull(),
  departureDateFrom: text("departure_date_from").notNull(),
  departureDateTo: text("departure_date_to").notNull(),
  truckCapacity: integer("truck_capacity").notNull().default(1),
  transportType: text("transport_type").notNull().default("open"),
  availableSpots: integer("available_spots").notNull().default(1),
  pricePerVehicle: real("price_per_vehicle"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type DriverRoute = typeof driverRoutesTable.$inferSelect;
export type InsertDriverRoute = typeof driverRoutesTable.$inferInsert;
