import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { verifyTotp } from "@/lib/twofactor";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { createSession, readPending2FACookie, clearPending2FACookie, getRequestMeta } from "@/lib/session";
import { logSecurityEvent } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

const schema = z.object({ code: z.string().min(6).max(10) });

export async function POST(req: NextRequest) {
  try {
    const userId = await readPending2FACookie();
    if (!userId) return apiError("Your login session has expired. Please log in again.", 401);

    const { ip } = await getRequestMeta();
    const { allowed } = rateLimit(`2fa:${userId}`, 10, 15 * 60 * 1000);
    if (!allowed) return apiError("Too many attempts. Please try again later.", 429);

    const { code } = schema.parse(await req.json());
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) return apiError("Two-factor authentication is not set up.", 400);

    let valid = verifyTotp(code, decryptSecret(user.twoFactorSecret));

    if (!valid) {
      const backupCode = await db.backupCode.findFirst({
        where: { userId, usedAt: null },
      });
      // Backup codes are stored hashed; compare using bcrypt in a follow-up if matched by lookup.
      if (backupCode) {
        const bcrypt = await import("bcryptjs");
        const matches = await bcrypt.compare(code.replace(/-/g, ""), backupCode.codeHash);
        if (matches) {
          valid = true;
          await db.backupCode.update({ where: { id: backupCode.id }, data: { usedAt: new Date() } });
        }
      }
    }

    if (!valid) {
      await logSecurityEvent({ userId, type: "2FA_FAILED" });
      return apiError("Invalid authentication code.", 401);
    }

    await clearPending2FACookie();
    await db.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
    await createSession(userId);
    await logSecurityEvent({ userId, type: "LOGIN" });
    await notifyUser({
      userId,
      type: "SECURITY",
      title: "New login to your account",
      message: `A new login was detected from IP ${ip}.`,
      emailTemplateKey: "login_alert",
      emailVars: { ip },
    });

    return apiOk({ isAdmin: user.isAdmin });
  } catch (err) {
    return handleApiError(err);
  }
}
