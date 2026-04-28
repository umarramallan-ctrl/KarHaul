import app from "./app";
import { logger } from "./lib/logger";
import { startCancellationScheduler } from "./lib/cancellation-scheduler";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
      throw new Error(
              "PORT environment variable is required but was not provided.",
            );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
      throw new Error(`Invalid PORT value: "${rawPort}"`);
}

/** Run idempotent ALTER TABLE migrations to add columns that may be missing
 * from the live database (added after initial schema creation). */
async function runMigrations() {
      try {
              // Shipments table: add columns added after initial schema creation
        await db.execute(sql`
              ALTER TABLE shipments
                      ADD COLUMN IF NOT EXISTS shipper_escrow_intent_id text,
                              ADD COLUMN IF NOT EXISTS shipper_escrow_amount real,
                                      ADD COLUMN IF NOT EXISTS shipper_escrow_status text DEFAULT 'none',
                                              ADD COLUMN IF NOT EXISTS is_priority boolean NOT NULL DEFAULT false,
                                                      ADD COLUMN IF NOT EXISTS nudge_sent boolean NOT NULL DEFAULT false,
                                                              ADD COLUMN IF NOT EXISTS invite_only_until timestamp,
                                                                      ADD COLUMN IF NOT EXISTS assigned_driver_id text
                                                                          `);
              // Bids table: add counter-offer columns added in the counter-offer feature
        await db.execute(sql`
              ALTER TABLE bids
                      ADD COLUMN IF NOT EXISTS counter_price real,
                              ADD COLUMN IF NOT EXISTS counter_status text,
                                      ADD COLUMN IF NOT EXISTS estimated_pickup_date text,
                                              ADD COLUMN IF NOT EXISTS estimated_delivery_date text,
                                                      ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now()
                                                          `);
              logger.info("DB migrations applied successfully");
      } catch (err) {
              logger.error({ err }, "DB migration failed — continuing anyway");
      }
}

runMigrations().then(() => {
      app.listen(port, (err) => {
              if (err) {
                        logger.error({ err }, "Error listening on port");
                        process.exit(1);
              }

                     logger.info({ port }, "Server listening");
              startCancellationScheduler();
      });
});
