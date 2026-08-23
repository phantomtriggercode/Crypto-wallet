import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/crypto";
import { apiOk, handleApiError } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { getRequestMeta } from "@/lib/session";
import { sendTemplatedEmail } from "@/lib/mailer";

const schema = z.object({ email: z.email().trim().toLowerCase() });
const GENERIC_MESSAGE = "If an account exists for this email, a reset link has been sent.";

export async function POST(req: NextRequest) {
  try {
    const { ip } = await getRequestMeta();
    const { allowed } = rateLimit(`pwreset:${ip}`, 8, 60 * 60 * 1000);
    if (!allowed) return apiOk({ message: GENERIC_MESSAGE });

    const { email } = schema.parse(await req.json());
    const user = await db.user.findUnique({ where: { email } });

    if (user) {
      const rawToken = generateToken(32);
      await db.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(rawToken),
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`;
      await sendTemplatedEmail({
        to: user.email,
        templateKey: "password_reset",
        vars: { user_name: user.fullName, reset_url: resetUrl },
      }).catch((err) => console.error("[password-reset] email send failed", err));
    }

    return apiOk({ message: GENERIC_MESSAGE });
  } catch (err) {
    return handleApiError(err);
  }
}
