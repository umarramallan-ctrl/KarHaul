import { Router, type IRouter } from "express";
import { db, usersTable, shipmentsTable, bookingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { stripe, computeEscrowAmounts, CANCELLATION_WINDOW_MS } from "../lib/stripe";
import { createNotification } from "../lib/notify";

const router: IRouter = Router();

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

// ──────────────────────────────────────────────────────────────
// Stripe Connect Express — driver onboarding
// ──────────────────────────────────────────────────────────────

router.post("/stripe/connect/onboard", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }

  let accountId = dbUser.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: dbUser.email ?? undefined,
      capabilities: { transfers: { requested: true } },
      metadata: { userId: dbUser.id },
    });
    accountId = account.id;
    await db.update(usersTable)
      .set({ stripeAccountId: accountId, stripeAccountStatus: "pending", updatedAt: new Date() })
      .where(eq(usersTable.id, dbUser.id));
  }

  const { returnUrl, refreshUrl } = req.body;
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl || `${process.env.APP_URL}/profile`,
    return_url: returnUrl || `${process.env.APP_URL}/profile`,
    type: "account_onboarding",
  });

  res.json({ url: accountLink.url });
});

router.get("/stripe/connect/status", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }

  if (!dbUser.stripeAccountId) {
    res.json({ status: "not_connected" });
    return;
  }

  const account = await stripe.accounts.retrieve(dbUser.stripeAccountId);
  const status = account.charges_enabled ? "active" : "pending";
  if (status !== dbUser.stripeAccountStatus) {
    await db.update(usersTable)
      .set({ stripeAccountStatus: status, updatedAt: new Date() })
      .where(eq(usersTable.id, dbUser.id));
  }
  res.json({ status, accountId: dbUser.stripeAccountId });
});

// ──────────────────────────────────────────────────────────────
// Escrow: create shipper payment intent when posting a load
// Called client-side after post-load confirmation modal
// ──────────────────────────────────────────────────────────────

router.post("/stripe/escrow/shipper/:shipmentId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }

  const [shipment] = await db.select().from(shipmentsTable)
    .where(eq(shipmentsTable.id, req.params.shipmentId)).limit(1);
  if (!shipment) { res.status(404).json({ error: "Shipment not found" }); return; }
  if (shipment.shipperId !== dbUser.id) { res.status(403).json({ error: "Forbidden" }); return; }
  if (shipment.shipperEscrowStatus !== "none" && shipment.shipperEscrowStatus !== null) {
    res.json({ status: shipment.shipperEscrowStatus, intentId: shipment.shipperEscrowIntentId });
    return;
  }

  const { shipperFeeCents, shipperFeeUsd } = computeEscrowAmounts(shipment.budgetMax);
  if (shipperFeeCents < 50) {
    // Below Stripe minimum — skip escrow
    await db.update(shipmentsTable)
      .set({ shipperEscrowStatus: "none", updatedAt: new Date() })
      .where(eq(shipmentsTable.id, shipment.id));
    res.json({ status: "skipped", reason: "amount_too_low" });
    return;
  }

  // Ensure shipper has a Stripe customer
  let customerId = dbUser.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: dbUser.email ?? undefined,
      name: `${dbUser.firstName ?? ""} ${dbUser.lastName ?? ""}`.trim() || undefined,
      metadata: { userId: dbUser.id },
    });
    customerId = customer.id;
    await db.update(usersTable)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(usersTable.id, dbUser.id));
  }

  const intent = await stripe.paymentIntents.create({
    amount: shipperFeeCents,
    currency: "usd",
    customer: customerId,
    capture_method: "manual",
    description: `KarHaul shipper escrow — 5% platform fee ($${shipperFeeUsd})`,
    metadata: { shipmentId: shipment.id, userId: dbUser.id, feeType: "shipper_escrow" },
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
  });

  await db.update(shipmentsTable).set({
    shipperEscrowIntentId: intent.id,
    shipperEscrowAmount: shipperFeeUsd,
    shipperEscrowStatus: "held",
    updatedAt: new Date(),
  }).where(eq(shipmentsTable.id, shipment.id));

  await createNotification({
    userId: dbUser.id,
    type: "escrow_held",
    title: "Escrow held",
    body: `$${shipperFeeUsd} platform fee is held in escrow for your load post.`,
    linkPath: `/shipments/${shipment.id}`,
  });

  res.json({ clientSecret: intent.client_secret, intentId: intent.id, amount: shipperFeeUsd });
});

// ──────────────────────────────────────────────────────────────
// Escrow: create driver payment intent when bid is accepted
// ──────────────────────────────────────────────────────────────

router.post("/stripe/escrow/driver/:bookingId", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }

  const [booking] = await db.select().from(bookingsTable)
    .where(eq(bookingsTable.id, req.params.bookingId)).limit(1);
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
  if (booking.driverId !== dbUser.id) { res.status(403).json({ error: "Forbidden" }); return; }
  if (booking.driverEscrowStatus !== "none" && booking.driverEscrowStatus !== null) {
    res.json({ status: booking.driverEscrowStatus, intentId: booking.driverEscrowIntentId });
    return;
  }

  const [shipment] = await db.select().from(shipmentsTable)
    .where(eq(shipmentsTable.id, booking.shipmentId)).limit(1);
  const { driverFeeCents, driverFeeUsd } = computeEscrowAmounts(shipment?.budgetMax);
  if (driverFeeCents < 50) {
    await db.update(bookingsTable)
      .set({ driverEscrowStatus: "none", updatedAt: new Date() })
      .where(eq(bookingsTable.id, booking.id));
    res.json({ status: "skipped", reason: "amount_too_low" });
    return;
  }

  let customerId = dbUser.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: dbUser.email ?? undefined,
      name: `${dbUser.firstName ?? ""} ${dbUser.lastName ?? ""}`.trim() || undefined,
      metadata: { userId: dbUser.id },
    });
    customerId = customer.id;
    await db.update(usersTable)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(usersTable.id, dbUser.id));
  }

  const intent = await stripe.paymentIntents.create({
    amount: driverFeeCents,
    currency: "usd",
    customer: customerId,
    capture_method: "manual",
    description: `KarHaul driver escrow — 3% platform fee ($${driverFeeUsd})`,
    metadata: { bookingId: booking.id, userId: dbUser.id, feeType: "driver_escrow" },
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
  });

  await db.update(bookingsTable).set({
    driverEscrowIntentId: intent.id,
    driverEscrowAmount: driverFeeUsd,
    driverEscrowStatus: "held",
    updatedAt: new Date(),
  }).where(eq(bookingsTable.id, booking.id));

  await createNotification({
    userId: dbUser.id,
    type: "escrow_held",
    title: "Escrow held",
    body: `$${driverFeeUsd} platform fee is held in escrow for booking #${booking.id.slice(0, 8)}.`,
    linkPath: `/bookings/${booking.id}`,
  });

  res.json({ clientSecret: intent.client_secret, intentId: intent.id, amount: driverFeeUsd });
});

// ──────────────────────────────────────────────────────────────
// Cancellation endpoint
// ──────────────────────────────────────────────────────────────

router.post("/bookings/:bookingId/cancel", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }

  const [booking] = await db.select().from(bookingsTable)
    .where(eq(bookingsTable.id, req.params.bookingId)).limit(1);
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  const isShipper = booking.shipperId === dbUser.id;
  const isDriver = booking.driverId === dbUser.id;
  if (!isShipper && !isDriver) { res.status(403).json({ error: "Forbidden" }); return; }

  if (!["confirmed"].includes(booking.status)) {
    res.status(400).json({ error: "Booking cannot be cancelled in its current status." });
    return;
  }

  const now = new Date();
  const withinWindow = booking.cancellationDeadline
    ? now <= new Date(booking.cancellationDeadline)
    : true;

  const [shipment] = await db.select().from(shipmentsTable)
    .where(eq(shipmentsTable.id, booking.shipmentId)).limit(1);

  if (withinWindow) {
    // Both parties get escrow returned
    await releaseEscrow(shipment, booking, "return", "return");
    const notifBody = "Both parties' escrow has been returned — cancellation within 2-hour window.";
    await createNotification({ userId: booking.shipperId, type: "escrow_returned" as any, title: "Booking cancelled", body: notifBody, linkPath: `/bookings/${booking.id}` });
    await createNotification({ userId: booking.driverId, type: "escrow_returned" as any, title: "Booking cancelled", body: notifBody, linkPath: `/bookings/${booking.id}` });
  } else if (isShipper) {
    // Shipper cancels after window — forfeits their escrow
    await releaseEscrow(shipment, booking, "capture", "return");
    await createNotification({ userId: booking.shipperId, type: "escrow_forfeited", title: "Escrow forfeited", body: "You cancelled after the 2-hour window. Your escrow fee was forfeited.", linkPath: `/bookings/${booking.id}` });
    await createNotification({ userId: booking.driverId, type: "escrow_released", title: "Escrow returned", body: "The shipper cancelled. Your escrow fee has been returned.", linkPath: `/bookings/${booking.id}` });
  } else {
    // Driver cancels after window — forfeits their escrow
    await releaseEscrow(shipment, booking, "return", "capture");
    await createNotification({ userId: booking.driverId, type: "escrow_forfeited", title: "Escrow forfeited", body: "You cancelled after the 2-hour window. Your escrow fee was forfeited.", linkPath: `/bookings/${booking.id}` });
    await createNotification({ userId: booking.shipperId, type: "escrow_released", title: "Escrow returned", body: "The driver cancelled. Your escrow fee has been returned.", linkPath: `/bookings/${booking.id}` });
  }

  await db.update(bookingsTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(bookingsTable.id, booking.id));
  await db.update(shipmentsTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(shipmentsTable.id, booking.shipmentId));

  res.json({ success: true, withinWindow });
});

// ──────────────────────────────────────────────────────────────
// No-show reports
// ──────────────────────────────────────────────────────────────

router.post("/bookings/:bookingId/no-show", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }

  const [booking] = await db.select().from(bookingsTable)
    .where(eq(bookingsTable.id, req.params.bookingId)).limit(1);
  if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }

  const isShipper = booking.shipperId === dbUser.id;
  const isDriver = booking.driverId === dbUser.id;
  if (!isShipper && !isDriver) { res.status(403).json({ error: "Forbidden" }); return; }

  const { noShowParty } = req.body; // "driver" | "shipper"
  const [shipment] = await db.select().from(shipmentsTable)
    .where(eq(shipmentsTable.id, booking.shipmentId)).limit(1);

  if (noShowParty === "driver") {
    // Driver no-show: driver forfeits, shipper gets return
    await releaseEscrow(shipment, booking, "return", "capture");
    await createNotification({ userId: booking.driverId, type: "escrow_forfeited", title: "Escrow forfeited — no-show", body: "You were marked as a no-show. Your escrow fee was forfeited.", linkPath: `/bookings/${booking.id}` });
    await createNotification({ userId: booking.shipperId, type: "escrow_released", title: "Escrow returned", body: "The driver was a no-show. Your escrow fee has been returned.", linkPath: `/bookings/${booking.id}` });
  } else {
    // Shipper no-show: shipper forfeits, driver gets return
    await releaseEscrow(shipment, booking, "capture", "return");
    await createNotification({ userId: booking.shipperId, type: "escrow_forfeited", title: "Escrow forfeited — no-show", body: "You were marked as a no-show. Your escrow fee was forfeited.", linkPath: `/bookings/${booking.id}` });
    await createNotification({ userId: booking.driverId, type: "escrow_released", title: "Escrow returned", body: "The shipper was a no-show. Your escrow fee has been returned.", linkPath: `/bookings/${booking.id}` });
  }

  await db.update(bookingsTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(bookingsTable.id, booking.id));

  res.json({ success: true });
});

// ──────────────────────────────────────────────────────────────
// Stripe webhook
// ──────────────────────────────────────────────────────────────

router.post("/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) { res.status(500).send("Webhook secret not configured"); return; }

  let event: import("stripe").Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as any;
    const { shipmentId, bookingId, feeType, userId } = intent.metadata ?? {};
    if (userId) {
      await createNotification({
        userId,
        type: "escrow_forfeited",
        title: "Payment failed",
        body: "Your escrow payment could not be processed. Please update your payment method.",
        linkPath: feeType === "shipper_escrow" ? `/shipments/${shipmentId}` : `/bookings/${bookingId}`,
      });
    }
  }

  res.json({ received: true });
});

// ──────────────────────────────────────────────────────────────
// Register push token
// ──────────────────────────────────────────────────────────────

router.post("/push-token", async (req, res) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }

  const { pushToken } = req.body;
  if (!pushToken || typeof pushToken !== "string") {
    res.status(400).json({ error: "pushToken required" });
    return;
  }

  await db.update(usersTable)
    .set({ pushToken, updatedAt: new Date() })
    .where(eq(usersTable.id, dbUser.id));

  res.json({ success: true });
});

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

async function releaseEscrow(
  shipment: any,
  booking: any,
  shipperAction: "capture" | "return",
  driverAction: "capture" | "return",
) {
  // Handle shipper escrow
  if (shipment?.shipperEscrowIntentId && shipment.shipperEscrowStatus === "held") {
    if (shipperAction === "capture") {
      try {
        await stripe.paymentIntents.capture(shipment.shipperEscrowIntentId);
        await db.update(shipmentsTable)
          .set({ shipperEscrowStatus: "captured", updatedAt: new Date() })
          .where(eq(shipmentsTable.id, shipment.id));
      } catch { /* already captured or cancelled */ }
    } else {
      try {
        await stripe.paymentIntents.cancel(shipment.shipperEscrowIntentId);
        await db.update(shipmentsTable)
          .set({ shipperEscrowStatus: "returned", updatedAt: new Date() })
          .where(eq(shipmentsTable.id, shipment.id));
      } catch { /* already cancelled */ }
    }
  }

  // Handle driver escrow
  if (booking?.driverEscrowIntentId && booking.driverEscrowStatus === "held") {
    if (driverAction === "capture") {
      try {
        await stripe.paymentIntents.capture(booking.driverEscrowIntentId);
        await db.update(bookingsTable)
          .set({ driverEscrowStatus: "captured", updatedAt: new Date() })
          .where(eq(bookingsTable.id, booking.id));
      } catch { /* already captured or cancelled */ }
    } else {
      try {
        await stripe.paymentIntents.cancel(booking.driverEscrowIntentId);
        await db.update(bookingsTable)
          .set({ driverEscrowStatus: "returned", updatedAt: new Date() })
          .where(eq(bookingsTable.id, booking.id));
      } catch { /* already cancelled */ }
    }
  }
}

export { releaseEscrow };
export default router;
