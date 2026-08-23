import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashToken } from "@/lib/crypto";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { notifyUser } from "@/lib/notify";

const schema = z.object({ token: z.string().min(10) });

export async function POST(req: NextRequest) {
  try {
    const { token } = schema.parse(await req.json());
    const tokenHash = hashToken(token);

    const record = await db.emailVerificationToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return apiError("This verification link is invalid or has expired.", 400);
    }

    await db.$transaction([
      db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
      db.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    await notifyUser({
      userId: record.userId,
      type: "SECURITY",
      title: "Email verified",
      message: "Your email address has been verified. You can now complete KYC and log in.",
    });

    return apiOk({ message: "Email verified successfully." });
  } catch (err) {
    return handleApiError(err);
  }
}
