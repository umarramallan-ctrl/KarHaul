import { pgTable, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bidsTable = pgTable("bids", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id").notNull(),
  driverId: text("driver_id").notNull(),
  amount: real("amount").notNull(),
  note: text("note"),
  estimatedPickupDate: text("estimated_pickup_date"),
  estimatedDeliveryDate: text("estimated_delivery_date"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBidSchema = createInsertSchema(bidsTable).omit({ createdAt: true, updatedAt: true });
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bidsTable.$inferSelect;
