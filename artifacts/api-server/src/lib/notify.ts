import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export type NotificationType =
  | "bid_received"
  | "bid_accepted"
  | "bid_rejected"
  | "new_message"
  | "booking_status"
  | "new_checkpoint"
  | "escrow_held"
  | "escrow_released"
  | "escrow_forfeited"
  | "cancellation_window_open"
  | "cancellation_window_closing"
  | "cancellation_window_30"
  | "cancellation_window_15"
  | "photo_uploaded"
  | "delivery_confirmation_request"
  | "load_match"        // driver lane match alert
  | "backhaul_match"   // shipper return lane match alert
  | "call_initiated"   // in-app call notification
  | "driver_invite";   // exclusive first-look invite

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkPath?: string;
}) {
  await db.insert(notificationsTable).values({
    id: randomUUID(),
    userId: params.userId,
    type: params.type,
    title: params.title,
    body: params.body,
    linkPath: params.linkPath ?? null,
    isRead: false,
  });

  // Fire-and-forget push notification to mobile if user has a push token
  sendPushNotification(params.userId, params.title, params.body, params.linkPath).catch(() => {
    // Non-critical — don't fail on push errors
  });
}

async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  linkPath?: string,
) {
  const [user] = await db.select({ pushToken: usersTable.pushToken })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user?.pushToken) return;

  const token = user.pushToken;
  if (!token.startsWith("ExponentPushToken[")) return;

  const message = {
    to: token,
    sound: "default",
    title,
    body,
    data: linkPath ? { path: linkPath } : {},
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}
