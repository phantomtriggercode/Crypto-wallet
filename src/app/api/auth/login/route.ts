import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { createSession, createPending2FACookie, getRequestMeta } from "@/lib/session";
import { logSecurityEvent } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { notifyUser } from "@/lib/notify";

const schema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});

const GENERIC_ERROR = "Invalid email or password.";

export async function POST(req: NextRequest) {
  try {
    const { ip } = await getRequestMeta();
    const { allowed } = rateLimit(`login:${ip}`, 15, 15 * 60 * 1000);
    if (!allowed) return apiError("Too many login attempts. Please try again later.", 429);

    const { email, password } = schema.parse(await req.json());
    const userLimit = rateLimit(`login-user:${email}`, 8, 15 * 60 * 1000);
    if (!userLimit.allowed) return apiError("Too many login attempts for this account. Please try again later.", 429);

    const user = await db.user.findUnique({ where: { email } });
    if (!user) return apiError(GENERIC_ERROR, 401);

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      await logSecurityEvent({ userId: user.id, type: "LOGIN_FAILED" });
      return apiError(GENERIC_ERROR, 401);
    }

    if (user.status === "SUSPENDED") {
      return apiError("This account has been suspended. Contact support for assistance.", 403);
    }

    if (!user.emailVerifiedAt) {
      return apiError("Please verify your email address before logging in.", 403, { code: "EMAIL_NOT_VERIFIED" });
    }

    const settings = await getSettings();
    const needs2FA = user.twoFactorEnabled || settings.require2FAGlobal;

    if (needs2FA && user.twoFactorEnabled) {
      await createPending2FACookie(user.id);
      return apiOk({ requires2FA: true });
    }

    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession(user.id);
    await logSecurityEvent({ userId: user.id, type: "LOGIN" });
    await notifyUser({
      userId: user.id,
      type: "SECURITY",
      title: "New login to your account",
      message: `A new login was detected from IP ${ip}.`,
      emailTemplateKey: "login_alert",
      emailVars: { ip },
    });

    return apiOk({ requires2FA: false, isAdmin: user.isAdmin });
  } catch (err) {
    return handleApiError(err);
  }
}
