import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;
if (!stripeKey && process.env.NODE_ENV === "production") {
  throw new Error("STRIPE_SECRET_KEY must be set in production");
}

export const stripe = new Stripe(stripeKey ?? "sk_test_placeholder", {
  apiVersion: "2025-02-24.acacia",
});

export const SHIPPER_FEE_PERCENT = 0.05; // 5% of budgetMax
export const DRIVER_FEE_PERCENT = 0.03;  // 3% of budgetMax
export const CANCELLATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Compute escrow amounts in cents (Stripe uses smallest currency unit).
 */
export function computeEscrowAmounts(budgetMax: number | null | undefined) {
  const base = budgetMax ?? 0;
  return {
    shipperFeeCents: Math.round(base * SHIPPER_FEE_PERCENT * 100),
    driverFeeCents: Math.round(base * DRIVER_FEE_PERCENT * 100),
    shipperFeeUsd: parseFloat((base * SHIPPER_FEE_PERCENT).toFixed(2)),
    driverFeeUsd: parseFloat((base * DRIVER_FEE_PERCENT).toFixed(2)),
  };
}
