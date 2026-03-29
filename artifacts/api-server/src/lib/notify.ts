import { db, notificationsTable } from "@workspace/db";
import { randomUUID } from "crypto";

type NotificationType =
  | "bid_received"
  | "bid_accepted"
  | "bid_rejected"
  | "new_message"
  | "booking_status"
  | "new_checkpoint";

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
}
