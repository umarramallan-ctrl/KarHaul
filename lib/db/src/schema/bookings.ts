import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookingsTable = pgTable("bookings", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id").notNull(),
  driverId: text("driver_id").notNull(),
  shipperId: text("shipper_id").notNull(),
  bidId: text("bid_id"),
  agreedPrice: real("agreed_price").notNull(),
  status: text("status").notNull().default("confirmed"),
  pickupConfirmedAt: timestamp("pickup_confirmed_at"),
  deliveryConfirmedAt: timestamp("delivery_confirmed_at"),
  trackingNotes: text("tracking_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ createdAt: true, updatedAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
