import { rateLimit } from "express-rate-limit";

/** General API limit: 300 requests per minute per IP */
export const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

/** Strict limit for auth endpoints: 20 per 15 minutes per IP */
export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Try again later." },
});

/** Bid submission: 30 bids per 10 minutes per IP */
export const bidLimiter = rateLimit({
  windowMs: 10 * 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many bids submitted. Please wait before trying again." },
});

/** Message sending: 60 messages per minute per IP */
export const messageLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Sending too fast. Slow down a bit." },
});
