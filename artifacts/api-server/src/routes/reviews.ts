import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reviewsTable, usersTable, bookingsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { createNotification } from "../lib/notify";
import { randomUUID } from "crypto";

const router: IRouter = Router();

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

// Public endpoint — returns approved 4-5 star reviews for homepage testimonials
router.get("/reviews/featured", async (req, res) => {
  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.isApproved, true))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(6);

  const enriched = await Promise.all(reviews.map(async (r) => {
    const [reviewer] = await db.select().from(usersTable).where(eq(usersTable.id, r.reviewerId)).limit(1);
    const firstName = reviewer?.firstName || "";
    const lastInitial = reviewer?.lastName ? `${reviewer.lastName[0]}.` : "";
    return {
      ...r,
      reviewerName: [firstName, lastInitial].filter(Boolean).join(" ") || "User",
    };
  }));

  res.json({ reviews: enriched });
});

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

  const { bookingId, revieweeId, rating, comment, timelyPickup, deliveryOnTime, timelyPayment } = req.body;

  // Determine reviewer role from the booking
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (booking.status !== "delivered") {
    res.status(400).json({ error: "Can only review completed bookings" });
    return;
  }

  const isShipper = booking.shipperId === dbUser.id;
  const isDriver = booking.driverId === dbUser.id;
  if (!isShipper && !isDriver) {
    res.status(403).json({ error: "Not a participant in this booking" });
    return;
  }

  // Prevent duplicate reviews from the same user for the same booking
  const [existing] = await db
    .select()
    .from(reviewsTable)
    .where(and(eq(reviewsTable.bookingId, bookingId), eq(reviewsTable.reviewerId, dbUser.id)))
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "Already reviewed this booking" });
    return;
  }

  const reviewerRole = isShipper ? "shipper" : "driver";

  const id = randomUUID();
  const trimmedComment = comment?.trim() || null;
  // Auto-approve reviews with rating >= 4 that include a written comment
  const isApproved = rating >= 4 && !!trimmedComment;

  await db.insert(reviewsTable).values({
    id,
    bookingId,
    reviewerId: dbUser.id,
    revieweeId,
    reviewerRole,
    rating,
    // Shippers rate drivers on pickup & delivery; drivers rate shippers on payment
    timelyPickup: isShipper ? (timelyPickup ?? null) : null,
    deliveryOnTime: isShipper ? (deliveryOnTime ?? null) : null,
    timelyPayment: isDriver ? (timelyPayment ?? null) : null,
    comment: trimmedComment,
    isApproved,
  });

  // Notify the reviewee that they received a new review
  const reviewerName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || "Someone";
  await createNotification({
    userId: revieweeId,
    type: "booking_status",
    title: "You received a new review",
    body: `${reviewerName} left you a ${rating}-star review.`,
    linkPath: `/bookings/${bookingId}`,
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

router.get("/reviews/booking/:bookingId", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) {
    res.status(400).json({ error: "Profile not found" });
    return;
  }

  const { bookingId } = req.params;

  // Verify the user is a participant
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId)).limit(1);
  if (!booking || (booking.shipperId !== dbUser.id && booking.driverId !== dbUser.id)) {
    res.status(403).json({ error: "Not a participant in this booking" });
    return;
  }

  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.bookingId, bookingId)).orderBy(desc(reviewsTable.createdAt));
  const enriched = await Promise.all(reviews.map(async (r) => {
    const [reviewer] = await db.select().from(usersTable).where(eq(usersTable.id, r.reviewerId)).limit(1);
    return {
      ...r,
      reviewerName: reviewer ? `${reviewer.firstName || ""} ${reviewer.lastName || ""}`.trim() || "User" : "User",
    };
  }));

  res.json({ reviews: enriched, total: enriched.length });
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
