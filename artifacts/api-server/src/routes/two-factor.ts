import { Router, type IRouter, type Request, type Response } from "express";
import { db, usersTable, smsCodesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import speakeasy from "speakeasy";
import { randomBytes } from "crypto";

const router: IRouter = Router();

// In-memory map for pending 2FA login sessions (cleared after use or 5 min expiry)
export const pending2FaSessions = new Map<string, { userId: string; method: string; expiresAt: number }>();

// Clean up expired pending sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of pending2FaSessions) {
    if (data.expiresAt < now) pending2FaSessions.delete(token);
  }
}, 60_000);

// ─── TOTP ──────────────────────────────────────────────────────────────────

// GET /api/auth/2fa/totp/setup
router.get("/totp/setup", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const userId = (req.user as any).id;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const generated = speakeasy.generateSecret({
      length: 20,
      name: `EVAUL (${user.email ?? user.firstName ?? "user"})`,
      issuer: "EVAUL",
    });
    const secret = generated.base32;
    const uri = generated.otpauth_url ?? "";

    res.json({ secret, uri });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate TOTP setup" });
  }
});

// POST /api/auth/2fa/totp/enable
router.post("/totp/enable", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const userId = (req.user as any).id;
    const { secret, code } = req.body as { secret: string; code: string };
    if (!secret || !code) { res.status(400).json({ error: "secret and code are required" }); return; }

    const isValid = speakeasy.totp.verify({ secret, encoding: "base32", token: code.replace(/\s/g, ""), window: 1 });
    if (!isValid) { res.status(400).json({ error: "Invalid code — try again" }); return; }

    await db.update(usersTable)
      .set({ totpSecret: secret, totpEnabled: true, twoFaMethod: "totp", updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to enable TOTP" });
  }
});

// POST /api/auth/2fa/totp/disable
router.post("/totp/disable", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const userId = (req.user as any).id;
    const { code } = req.body as { code?: string };
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    if (user.totpEnabled && user.totpSecret) {
      if (!code) { res.status(400).json({ error: "code is required to disable TOTP" }); return; }
      const isValid = speakeasy.totp.verify({ secret: user.totpSecret, encoding: "base32", token: code.replace(/\s/g, ""), window: 1 });
      if (!isValid) { res.status(400).json({ error: "Invalid code" }); return; }
    }

    const newMethod = user.smsOtpEnabled ? "sms" : "none";
    await db.update(usersTable)
      .set({ totpSecret: null, totpEnabled: false, twoFaMethod: newMethod, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to disable TOTP" });
  }
});

// ─── SMS ───────────────────────────────────────────────────────────────────

async function sendSmsCode(phone: string, code: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (sid && token && from) {
    const twilio = (await import("twilio")).default;
    const client = twilio(sid, token);
    await client.messages.create({
      body: `Your EVAUL verification code is: ${code}`,
      from,
      to: phone,
    });
  } else {
    // Dev mode — log to console
    console.log(`[SMS DEV MODE] Code for ${phone}: ${code}`);
  }
}

function generateSmsCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// POST /api/auth/2fa/sms/send
router.post("/sms/send", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const userId = (req.user as any).id;
    const { phone } = req.body as { phone?: string };

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const targetPhone = phone ?? user.phone;
    if (!targetPhone) { res.status(400).json({ error: "Phone number is required" }); return; }

    const code = generateSmsCode();
    const id = randomBytes(12).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(smsCodesTable).values({ id, userId, phone: targetPhone, code, purpose: "verify", expiresAt });
    await sendSmsCode(targetPhone, code);

    res.json({ ok: true, phone: targetPhone });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send SMS code" });
  }
});

// POST /api/auth/2fa/sms/enable
router.post("/sms/enable", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const userId = (req.user as any).id;
    const { code, phone } = req.body as { code: string; phone: string };
    if (!code || !phone) { res.status(400).json({ error: "code and phone are required" }); return; }

    const now = new Date();
    const [record] = await db.select().from(smsCodesTable).where(
      and(
        eq(smsCodesTable.userId, userId),
        eq(smsCodesTable.phone, phone),
        eq(smsCodesTable.code, code),
        eq(smsCodesTable.used, false),
        gt(smsCodesTable.expiresAt, now),
      )
    );

    if (!record) { res.status(400).json({ error: "Invalid or expired code" }); return; }

    await db.update(smsCodesTable).set({ used: true }).where(eq(smsCodesTable.id, record.id));

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    const newMethod = user?.totpEnabled ? "totp" : "sms";
    await db.update(usersTable)
      .set({ phone, smsOtpEnabled: true, twoFaMethod: newMethod, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to enable SMS 2FA" });
  }
});

// POST /api/auth/2fa/sms/disable
router.post("/sms/disable", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const userId = (req.user as any).id;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const newMethod = user.totpEnabled ? "totp" : "none";
    await db.update(usersTable)
      .set({ smsOtpEnabled: false, twoFaMethod: newMethod, updatedAt: new Date() })
      .where(eq(usersTable.id, userId));

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to disable SMS 2FA" });
  }
});

// ─── LOGIN 2FA FLOW ────────────────────────────────────────────────────────

// POST /api/auth/2fa/login/sms-code — send SMS code during login (no session yet)
router.post("/login/sms-code", async (req: Request, res: Response) => {
  try {
    const pendingToken = req.cookies?.["pending_2fa"];
    if (!pendingToken) { res.status(401).json({ error: "No pending 2FA session" }); return; }

    const session = pending2FaSessions.get(pendingToken);
    if (!session || session.expiresAt < Date.now()) {
      res.status(401).json({ error: "Session expired, please log in again" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
    if (!user?.phone) { res.status(400).json({ error: "No phone number on file" }); return; }

    const code = generateSmsCode();
    const id = randomBytes(12).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await db.insert(smsCodesTable).values({ id, userId: session.userId, phone: user.phone, code, purpose: "login", expiresAt });
    await sendSmsCode(user.phone, code);

    res.json({ ok: true, phone: user.phone });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send SMS code" });
  }
});

// POST /api/auth/2fa/verify — verify code and upgrade pending session to a real session
router.post("/verify", async (req: Request, res: Response) => {
  try {
    const pendingToken = req.cookies?.["pending_2fa"];
    if (!pendingToken) { res.status(401).json({ error: "No pending 2FA session" }); return; }

    const session = pending2FaSessions.get(pendingToken);
    if (!session || session.expiresAt < Date.now()) {
      res.status(401).json({ error: "Session expired, please log in again" });
      return;
    }

    const { code } = req.body as { code: string };
    if (!code) { res.status(400).json({ error: "code is required" }); return; }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    let verified = false;

    if (user.twoFaMethod === "totp" && user.totpSecret) {
      verified = speakeasy.totp.verify({ secret: user.totpSecret, encoding: "base32", token: code.replace(/\s/g, ""), window: 1 });
    } else if (user.twoFaMethod === "sms") {
      const now = new Date();
      const [record] = await db.select().from(smsCodesTable).where(
        and(
          eq(smsCodesTable.userId, user.id),
          eq(smsCodesTable.code, code),
          eq(smsCodesTable.purpose, "login"),
          eq(smsCodesTable.used, false),
          gt(smsCodesTable.expiresAt, now),
        )
      );
      if (record) {
        await db.update(smsCodesTable).set({ used: true }).where(eq(smsCodesTable.id, record.id));
        verified = true;
      }
    }

    if (!verified) { res.status(400).json({ error: "Invalid code — try again" }); return; }

    // Import session creation here to avoid circular deps
    const { createSession, SESSION_TTL } = await import("../lib/auth");
    const sid = await createSession({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      },
    });

    res.cookie("sid", sid, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL,
    });

    pending2FaSessions.delete(pendingToken);
    res.clearCookie("pending_2fa");

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification failed" });
  }
});

// GET /api/auth/2fa/status
router.get("/status", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const userId = (req.user as any).id;
    const [user] = await db.select({
      totpEnabled: usersTable.totpEnabled,
      smsOtpEnabled: usersTable.smsOtpEnabled,
      twoFaMethod: usersTable.twoFaMethod,
      phone: usersTable.phone,
    }).from(usersTable).where(eq(usersTable.id, userId));

    res.json(user ?? { totpEnabled: false, smsOtpEnabled: false, twoFaMethod: "none", phone: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch 2FA status" });
  }
});

export default router;
