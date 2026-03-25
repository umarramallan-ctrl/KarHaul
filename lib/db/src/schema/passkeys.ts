import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const passkeyCredentialsTable = pgTable("passkey_credentials", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  credentialId: text("credential_id").notNull().unique(),
  publicKey: text("public_key").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceType: text("device_type").notNull().default("singleDevice"),
  backedUp: boolean("backed_up").notNull().default(false),
  transports: text("transports"),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type PasskeyCredential = typeof passkeyCredentialsTable.$inferSelect;
