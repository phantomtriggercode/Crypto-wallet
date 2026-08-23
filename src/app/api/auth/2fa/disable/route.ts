import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { verifyTotp } from "@/lib/twofactor";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { logSecurityEvent } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

const schema = z.object({ code: z.string().min(6).max(6) });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return apiError("Two-factor authentication is not enabled.", 400);
    }

    const { code } = schema.parse(await req.json());
    const valid = verifyTotp(code, decryptSecret(user.twoFactorSecret));
    if (!valid) return apiError("Invalid authentication code.", 401);

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorMethod: null },
      }),
      db.backupCode.deleteMany({ where: { userId: user.id } }),
    ]);

    await logSecurityEvent({ userId: user.id, type: "2FA_DISABLED" });
    await notifyUser({
      userId: user.id,
      type: "SECURITY",
      title: "Two-factor authentication disabled",
      message: "2FA has been disabled on your account. If this wasn't you, secure your account immediately.",
      emailTemplateKey: "security_alert",
      emailVars: { event: "Two-factor authentication was disabled" },
    });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
