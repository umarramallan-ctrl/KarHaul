import { Router, type IRouter, type Request, type Response } from "express";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/types";
import { db, passkeyCredentialsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createSession, SESSION_TTL } from "../lib/auth";
import type { SessionData } from "../lib/auth";
import crypto from "crypto";

const router: IRouter = Router();

const RP_NAME = "EvoHaul";
const challenges = new Map<string, { challenge: string; userId?: string; expires: number }>();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function getRpId(req: Request): string {
  const origin = getOrigin(req);
  try { return new URL(origin).hostname; } catch { return "localhost"; }
}

function cleanupChallenges() {
  const now = Date.now();
  for (const [key, val] of challenges) { if (val.expires < now) challenges.delete(key); }
}

async function getDbUser(authId: string) {
  const users = await db.select().from(usersTable).where(eq(usersTable.authId, authId)).limit(1);
  return users[0] || null;
}

// ── Registration ──────────────────────────────────────────────────────────────

router.get("/auth/passkey/register/options", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "You must be logged in to add a passkey" }); return; }

  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }

  const existing = await db.select().from(passkeyCredentialsTable).where(eq(passkeyCredentialsTable.userId, dbUser.id));
  const excludeCredentials = existing.map(c => ({
    id: c.credentialId,
    type: "public-key" as const,
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(req),
    userID: new TextEncoder().encode(dbUser.id),
    userName: dbUser.email || dbUser.authId,
    userDisplayName: [dbUser.firstName, dbUser.lastName].filter(Boolean).join(" ") || dbUser.email || "User",
    attestationType: "none",
    excludeCredentials,
    authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
  });

  cleanupChallenges();
  const key = crypto.randomBytes(16).toString("hex");
  challenges.set(key, { challenge: options.challenge, userId: dbUser.id, expires: Date.now() + 5 * 60 * 1000 });

  res.json({ options, challengeKey: key });
});

router.post("/auth/passkey/register/verify", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.status(400).json({ error: "Profile not found" }); return; }

  const { credential, challengeKey, name } = req.body;
  const entry = challenges.get(challengeKey);
  if (!entry || entry.userId !== dbUser.id || entry.expires < Date.now()) {
    res.status(400).json({ error: "Invalid or expired challenge. Please try again." }); return;
  }
  challenges.delete(challengeKey);

  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: entry.challenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Verification failed" }); return;
  }

  if (!verification.verified || !verification.registrationInfo) {
    res.status(400).json({ error: "Passkey registration could not be verified" }); return;
  }

  const { credential: regCredential } = verification.registrationInfo;
  const id = crypto.randomUUID();
  await db.insert(passkeyCredentialsTable).values({
    id,
    userId: dbUser.id,
    credentialId: regCredential.id,
    publicKey: Buffer.from(regCredential.publicKey).toString("base64url"),
    counter: regCredential.counter,
    deviceType: verification.registrationInfo.credentialDeviceType,
    backedUp: verification.registrationInfo.credentialBackedUp,
    transports: JSON.stringify(credential.response?.transports || []),
    name: name || "Passkey",
  });

  res.json({ verified: true, id });
});

// ── Authentication ────────────────────────────────────────────────────────────

router.post("/auth/passkey/login/options", async (req: Request, res: Response) => {
  const options = await generateAuthenticationOptions({
    rpID: getRpId(req),
    userVerification: "preferred",
    allowCredentials: [],
  });

  cleanupChallenges();
  const key = crypto.randomBytes(16).toString("hex");
  challenges.set(key, { challenge: options.challenge, expires: Date.now() + 5 * 60 * 1000 });

  res.json({ options, challengeKey: key });
});

router.post("/auth/passkey/login/verify", async (req: Request, res: Response) => {
  const { credential, challengeKey } = req.body;
  const entry = challenges.get(challengeKey);
  if (!entry || entry.expires < Date.now()) {
    res.status(400).json({ error: "Invalid or expired challenge. Please try again." }); return;
  }
  challenges.delete(challengeKey);

  const [stored] = await db.select().from(passkeyCredentialsTable).where(eq(passkeyCredentialsTable.credentialId, credential.id)).limit(1);
  if (!stored) { res.status(400).json({ error: "Passkey not recognized on this account" }); return; }

  let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  try {
    const transports: AuthenticatorTransportFuture[] = stored.transports ? JSON.parse(stored.transports) : [];
    verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: entry.challenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
      credential: {
        id: stored.credentialId,
        publicKey: Buffer.from(stored.publicKey, "base64url"),
        counter: stored.counter,
        transports,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Passkey verification failed" }); return;
  }

  if (!verification.verified) {
    res.status(400).json({ error: "Passkey could not be verified" }); return;
  }

  await db.update(passkeyCredentialsTable).set({ counter: verification.authenticationInfo.newCounter }).where(eq(passkeyCredentialsTable.id, stored.id));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, stored.userId)).limit(1);
  if (!user) { res.status(400).json({ error: "User account not found" }); return; }

  const sessionData: SessionData = {
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, profileImageUrl: user.profileImageUrl },
    access_token: "passkey",
  };

  const sid = await createSession(sessionData);
  res.cookie("sid", sid, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: SESSION_TTL });
  res.json({ verified: true });
});

// ── Manage passkeys ───────────────────────────────────────────────────────────

router.get("/auth/passkey/list", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  if (!dbUser) { res.json({ passkeys: [] }); return; }
  const passkeys = await db.select().from(passkeyCredentialsTable).where(eq(passkeyCredentialsTable.userId, dbUser.id));
  res.json({ passkeys: passkeys.map(p => ({ id: p.id, name: p.name, deviceType: p.deviceType, backedUp: p.backedUp, createdAt: p.createdAt })) });
});

router.delete("/auth/passkey/:passkeyId", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const dbUser = await getDbUser((req.user as any).id);
  const [pk] = await db.select().from(passkeyCredentialsTable).where(eq(passkeyCredentialsTable.id, req.params.passkeyId)).limit(1);
  if (!pk || pk.userId !== dbUser?.id) { res.status(403).json({ error: "Not found" }); return; }
  await db.delete(passkeyCredentialsTable).where(eq(passkeyCredentialsTable.id, pk.id));
  res.json({ success: true });
});

export { router as passkeyRouter };
export default router;
