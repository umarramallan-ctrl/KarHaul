import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { messagesTable, conversationsTable, usersTable } from "@workspace/db";
import { eq, or, and, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { checkMessageContent } from "../lib/message-filter";
import { createNotification } from "../lib/notify";
import { messageLimiter } from "../lib/rate-limit";

const router: IRouter = Router();

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

router.get("/conversations", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) {
    res.json({ conversations: [] });
    return;
  }
  const convs = await db.select().from(conversationsTable)
    .where(or(eq(conversationsTable.user1Id, dbUser.id), eq(conversationsTable.user2Id, dbUser.id)))
    .orderBy(desc(conversationsTable.lastMessageAt));

  const enriched = await Promise.all(convs.map(async (c) => {
    const otherId = c.user1Id === dbUser.id ? c.user2Id : c.user1Id;
    const [other] = await db.select().from(usersTable).where(eq(usersTable.id, otherId)).limit(1);
    const [lastMsg] = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, c.id))
      .orderBy(desc(messagesTable.createdAt))
      .limit(1);
    const unreadMsgs = await db.select().from(messagesTable)
      .where(and(eq(messagesTable.conversationId, c.id), eq(messagesTable.isRead, 0)));
    const unreadCount = unreadMsgs.filter(m => m.senderId !== dbUser.id).length;
    return {
      id: c.id,
      otherUserId: otherId,
      otherUserName: other ? `${other.firstName || ""} ${other.lastName || ""}`.trim() || "User" : "Unknown",
      otherUserAvatar: other?.profileImageUrl || null,
      otherUserPhone: other?.phone || null,
      shipmentId: c.shipmentId,
      lastMessage: lastMsg?.content || null,
      lastMessageAt: lastMsg?.createdAt?.toISOString() || c.lastMessageAt?.toISOString(),
      unreadCount,
    };
  }));
  res.json({ conversations: enriched });
});

router.get("/messages/:conversationId", async (req, res) => {
  const { conversationId } = req.params;
  const messages = await db.select().from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt);

  const enriched = await Promise.all(messages.map(async (m) => {
    const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, m.senderId)).limit(1);
    return {
      ...m,
      senderName: sender ? `${sender.firstName || ""} ${sender.lastName || ""}`.trim() || "User" : "User",
    };
  }));
  if (req.isAuthenticated()) {
    const dbUser = await getDbUser((req.user as any).id);
    if (dbUser) {
      await db.update(messagesTable).set({ isRead: 1 })
        .where(and(eq(messagesTable.conversationId, conversationId)));
    }
  }
  res.json({ messages: enriched, conversationId });
});

router.post("/messages", messageLimiter, async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) {
    res.status(400).json({ error: "Profile not found" });
    return;
  }
  const { recipientId, shipmentId, content } = req.body;

  const filter = checkMessageContent(content || "");
  if (filter.blocked) {
    res.status(400).json({ error: filter.reason, code: "CONTENT_BLOCKED" });
    return;
  }
  let conv = await db.select().from(conversationsTable)
    .where(or(
      and(eq(conversationsTable.user1Id, dbUser.id), eq(conversationsTable.user2Id, recipientId)),
      and(eq(conversationsTable.user1Id, recipientId), eq(conversationsTable.user2Id, dbUser.id))
    )).limit(1);

  let conversationId: string;
  if (conv.length === 0) {
    conversationId = randomUUID();
    await db.insert(conversationsTable).values({
      id: conversationId,
      user1Id: dbUser.id,
      user2Id: recipientId,
      shipmentId: shipmentId || null,
      lastMessageAt: new Date(),
    });
  } else {
    conversationId = conv[0].id;
    await db.update(conversationsTable).set({ lastMessageAt: new Date() }).where(eq(conversationsTable.id, conversationId));
  }

  const msgId = randomUUID();
  await db.insert(messagesTable).values({
    id: msgId,
    conversationId,
    senderId: dbUser.id,
    content,
    isRead: 0,
  });
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, msgId)).limit(1);

  // Notify the recipient
  const senderName = `${dbUser.firstName || ""} ${dbUser.lastName || ""}`.trim() || "Someone";
  const preview = content.length > 60 ? content.slice(0, 57) + "…" : content;
  await createNotification({
    userId: recipientId,
    type: "new_message",
    title: `New message from ${senderName}`,
    body: preview,
    linkPath: "/messages",
  });

  res.status(201).json({ ...msg, senderName });
});

export default router;
