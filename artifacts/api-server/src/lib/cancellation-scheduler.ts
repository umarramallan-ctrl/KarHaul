import { db, bookingsTable, notificationsTable } from "@workspace/db";
import { and, eq, gte, lte } from "drizzle-orm";
import { createNotification } from "./notify";

async function alreadySent(userId: string, type: string, linkPath: string): Promise<boolean> {
  const rows = await db
    .select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.type, type),
        eq(notificationsTable.linkPath, linkPath)
      )
    )
    .limit(1);
  return rows.length > 0;
}

async function runCheck() {
  const now = new Date();

  // 30-minute window: deadline between 29 and 31 minutes from now
  const m30lo = new Date(now.getTime() + 29 * 60_000);
  const m30hi = new Date(now.getTime() + 31 * 60_000);

  // 15-minute window: deadline between 14 and 16 minutes from now
  const m15lo = new Date(now.getTime() + 14 * 60_000);
  const m15hi = new Date(now.getTime() + 16 * 60_000);

  const bookings30 = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.status, "confirmed"),
        gte(bookingsTable.cancellationDeadline, m30lo),
        lte(bookingsTable.cancellationDeadline, m30hi)
      )
    );

  for (const b of bookings30) {
    const link = `/bookings/${b.id}`;
    if (!(await alreadySent(b.shipperId, "cancellation_window_30", link))) {
      await createNotification({
        userId: b.shipperId,
        type: "cancellation_window_30",
        title: "⏰ 30 min left to cancel free",
        body: "Your penalty-free cancellation window closes in 30 minutes. Cancel now to get your escrow back.",
        linkPath: link,
      });
    }
    if (!(await alreadySent(b.driverId, "cancellation_window_30", link))) {
      await createNotification({
        userId: b.driverId,
        type: "cancellation_window_30",
        title: "⏰ 30 min left to cancel free",
        body: "Your penalty-free cancellation window closes in 30 minutes. Cancel now to avoid escrow forfeiture.",
        linkPath: link,
      });
    }
  }

  const bookings15 = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.status, "confirmed"),
        gte(bookingsTable.cancellationDeadline, m15lo),
        lte(bookingsTable.cancellationDeadline, m15hi)
      )
    );

  for (const b of bookings15) {
    const link = `/bookings/${b.id}`;
    if (!(await alreadySent(b.shipperId, "cancellation_window_15", link))) {
      await createNotification({
        userId: b.shipperId,
        type: "cancellation_window_15",
        title: "⚠️ 15 min left — cancel now",
        body: "Cancellation window closes in 15 minutes. After that, cancelling forfeits your escrow fee.",
        linkPath: link,
      });
    }
    if (!(await alreadySent(b.driverId, "cancellation_window_15", link))) {
      await createNotification({
        userId: b.driverId,
        type: "cancellation_window_15",
        title: "⚠️ 15 min left — cancel now",
        body: "Cancellation window closes in 15 minutes. After that, cancelling forfeits your escrow fee.",
        linkPath: link,
      });
    }
  }
}

export function startCancellationScheduler() {
  // Run immediately once, then every 60 seconds
  runCheck().catch(() => {});
  setInterval(() => runCheck().catch(() => {}), 60_000);
}
