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
 *  from the live database (added after initial schema creation). */
async function runMigrations() {
    try {
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
