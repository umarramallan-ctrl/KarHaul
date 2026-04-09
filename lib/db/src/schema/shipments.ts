import { pgTable, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shipmentsTable = pgTable("shipments", {
  id: text("id").primaryKey(),
  shipperId: text("shipper_id").notNull(),
  vehicleYear: integer("vehicle_year").notNull(),
  vehicleMake: text("vehicle_make").notNull(),
  vehicleModel: text("vehicle_model").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  vehicleCondition: text("vehicle_condition").notNull(),
  vin: text("vin"),
  transportType: text("transport_type").notNull(),
  serviceType: text("service_type"),
  originAddress: text("origin_address"),
  originCity: text("origin_city").notNull(),
  originState: text("origin_state").notNull(),
  originZip: text("origin_zip").notNull(),
  destinationAddress: text("destination_address"),
  destinationCity: text("destination_city").notNull(),
  destinationState: text("destination_state").notNull(),
  destinationZip: text("destination_zip").notNull(),
  pickupDateFrom: text("pickup_date_from"),
  pickupDateTo: text("pickup_date_to"),
  budgetMin: real("budget_min"),
  budgetMax: real("budget_max"),
  notes: text("notes"),
  pickupLocationType: text("pickup_location_type"),
  deliveryLocationType: text("delivery_location_type"),
  status: text("status").notNull().default("open"),
  bidCount: integer("bid_count").notNull().default(0),
  assignedDriverId: text("assigned_driver_id"),
  // Shipper escrow: 5% of budgetMax held when load is posted
  shipperEscrowIntentId: text("shipper_escrow_intent_id"),
  shipperEscrowAmount: real("shipper_escrow_amount"),
  shipperEscrowStatus: text("shipper_escrow_status").default("none"), // none | held | captured | returned
  // Premium priority placement
  isPriority: boolean("is_priority").notNull().default(false),
  // Saved-driver exclusive window: load hidden from public list until this time
  inviteOnlyUntil: timestamp("invite_only_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertShipmentSchema = createInsertSchema(shipmentsTable).omit({ createdAt: true, updatedAt: true, bidCount: true });
export type InsertShipment = z.infer<typeof insertShipmentSchema>;
export type Shipment = typeof shipmentsTable.$inferSelect;
