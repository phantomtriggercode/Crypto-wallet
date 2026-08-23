import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser, getCurrentSession } from "@/lib/session";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { logSecurityEvent } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

const schema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8)
      .regex(/[a-zA-Z]/, "Password must contain a letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { currentPassword, newPassword } = schema.parse(await req.json());
    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) return apiError("Current password is incorrect.", 401);

    const currentSession = await getCurrentSession();
    const passwordHash = await hashPassword(newPassword);

    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash } }),
      db.session.updateMany({
        where: { userId: user.id, revokedAt: null, NOT: { id: currentSession?.id ?? "" } },
        data: { revokedAt: new Date() },
      }),
    ]);

    await logSecurityEvent({ userId: user.id, type: "PASSWORD_CHANGE" });
    await notifyUser({
      userId: user.id,
      type: "SECURITY",
      title: "Password changed",
      message: "Your password was changed. Other active sessions were signed out.",
      emailTemplateKey: "security_alert",
      emailVars: { event: "Your password was changed" },
    });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
