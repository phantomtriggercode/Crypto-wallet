import { NextRequest } from "next/server";
import { z } from "zod";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
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
    if (!user.twoFactorSecret) return apiError("Start 2FA setup first.", 400);

    const { code } = schema.parse(await req.json());
    const valid = verifyTotp(code, decryptSecret(user.twoFactorSecret));
    if (!valid) return apiError("Invalid authentication code.", 401);

    const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString("hex"));
    const backupCodeHashes = await Promise.all(backupCodes.map((code) => bcrypt.hash(code, 10)));

    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
      await tx.backupCode.deleteMany({ where: { userId: user.id } });
      await tx.backupCode.createMany({
        data: backupCodeHashes.map((codeHash) => ({ userId: user.id, codeHash })),
      });
    });

    await logSecurityEvent({ userId: user.id, type: "2FA_ENABLED" });
    await notifyUser({
      userId: user.id,
      type: "SECURITY",
      title: "Two-factor authentication enabled",
      message: "2FA has been enabled on your account.",
      emailTemplateKey: "security_alert",
      emailVars: { event: "Two-factor authentication was enabled" },
    });

    return apiOk({ backupCodes });
  } catch (err) {
    return handleApiError(err);
  }
}
