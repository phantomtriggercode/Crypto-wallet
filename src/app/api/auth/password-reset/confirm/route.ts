import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashToken, hashPassword } from "@/lib/crypto";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { logSecurityEvent } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

const schema = z
  .object({
    token: z.string().min(10),
    password: z
      .string()
      .min(8)
      .regex(/[a-zA-Z]/, "Password must contain a letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export async function POST(req: NextRequest) {
  try {
    const { token, password } = schema.parse(await req.json());
    const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return apiError("This reset link is invalid or has expired.", 400);
    }

    const passwordHash = await hashPassword(password);
    await db.$transaction([
      db.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Invalidate all existing sessions on password reset.
      db.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    await logSecurityEvent({ userId: record.userId, type: "PASSWORD_RESET" });
    await notifyUser({
      userId: record.userId,
      type: "SECURITY",
      title: "Password changed",
      message: "Your password was reset. All active sessions were signed out for your security.",
      emailTemplateKey: "security_alert",
      emailVars: { event: "Your password was reset" },
    });

    return apiOk({ message: "Password updated. You can now log in with your new password." });
  } catch (err) {
    return handleApiError(err);
  }
}
