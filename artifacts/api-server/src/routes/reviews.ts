import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reviewsTable, usersTable } from "@workspace/db";
import { eq, avg, count, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

router.post("/reviews", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) {
    res.status(400).json({ error: "Profile not found" });
    return;
  }
  const { bookingId, revieweeId, rating, comment } = req.body;
  const id = randomUUID();
  await db.insert(reviewsTable).values({
    id,
    bookingId,
    reviewerId: dbUser.id,
    revieweeId,
    rating,
    comment: comment || null,
  });
  const allReviews = await db.select().from(reviewsTable).where(eq(reviewsTable.revieweeId, revieweeId));
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  await db.update(usersTable).set({
    averageRating: avgRating,
    totalReviews: allReviews.length,
  }).where(eq(usersTable.id, revieweeId));
  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id)).limit(1);
  res.status(201).json(review);
});

router.get("/reviews/user/:userId", async (req, res) => {
  const { userId } = req.params;
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.revieweeId, userId)).orderBy(desc(reviewsTable.createdAt));
  const enriched = await Promise.all(reviews.map(async (r) => {
    const [reviewer] = await db.select().from(usersTable).where(eq(usersTable.id, r.reviewerId)).limit(1);
    return {
      ...r,
      reviewerName: reviewer ? `${reviewer.firstName || ""} ${reviewer.lastName || ""}`.trim() || "User" : "User",
    };
  }));
  const avgRating = enriched.length > 0 ? enriched.reduce((s, r) => s + r.rating, 0) / enriched.length : 0;
  res.json({ reviews: enriched, averageRating: avgRating, total: enriched.length });
});

export default router;
