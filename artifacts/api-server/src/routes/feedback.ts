import { Router, type IRouter } from "express";
import { db, feedbackTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.post("/feedback", async (req, res) => {
  const { category, rating, message, email } = req.body;

  if (!category || !message) {
    res.status(400).json({ error: "category and message are required" });
    return;
  }

  let userId: string | null = null;
  let resolvedEmail = email || null;

  if (req.isAuthenticated()) {
    const [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.authId, (req.user as any).id))
      .limit(1);
    if (dbUser) {
      userId = dbUser.id;
      resolvedEmail = resolvedEmail || dbUser.email;
    }
  }

  const id = randomUUID();
  await db.insert(feedbackTable).values({
    id,
    userId,
    email: resolvedEmail,
    category,
    rating: rating ?? null,
    message,
  });

  res.status(201).json({ id });
});

export default router;
