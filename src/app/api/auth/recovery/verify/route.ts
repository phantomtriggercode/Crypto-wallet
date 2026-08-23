import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyRecoveryPhrase, generateToken, hashToken } from "@/lib/crypto";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { getRequestMeta } from "@/lib/session";
import { logSecurityEvent } from "@/lib/audit";

const schema = z.object({
  email: z.email().trim().toLowerCase(),
  phrase: z.array(z.string().min(2)).length(12),
});

export async function POST(req: NextRequest) {
  try {
    const { ip } = await getRequestMeta();
    const { allowed } = rateLimit(`recovery:${ip}`, 8, 60 * 60 * 1000);
    if (!allowed) return apiError("Too many attempts. Please try again later.", 429);

    const { email, phrase } = schema.parse(await req.json());
    const user = await db.user.findUnique({ where: { email } });

    const GENERIC_ERROR = "Recovery phrase or email is incorrect.";
    if (!user || !user.recoveryPhraseHash) return apiError(GENERIC_ERROR, 400);

    const valid = await verifyRecoveryPhrase(phrase, user.recoveryPhraseHash);
    if (!valid) {
      await logSecurityEvent({ userId: user.id, type: "RECOVERY_FAILED" });
      return apiError(GENERIC_ERROR, 400);
    }

    const rawToken = generateToken(32);
    await db.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    await logSecurityEvent({ userId: user.id, type: "RECOVERY_SUCCESS" });

    return apiOk({ resetToken: rawToken });
  } catch (err) {
    return handleApiError(err);
  }
}
