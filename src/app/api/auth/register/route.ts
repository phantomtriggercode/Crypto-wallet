import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, generateToken, hashToken } from "@/lib/crypto";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { rateLimit } from "@/lib/rateLimit";
import { getRequestMeta } from "@/lib/session";
import { sendTemplatedEmail } from "@/lib/mailer";

const schema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    email: z.email().trim().toLowerCase(),
    password: z
      .string()
      .min(8)
      .regex(/[a-zA-Z]/, "Password must contain a letter")
      .regex(/[0-9]/, "Password must contain a number"),
    confirmPassword: z.string(),
    phone: z.string().trim().min(5).max(30).optional().or(z.literal("")),
    country: z.string().trim().min(2).max(60),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(req: NextRequest) {
  try {
    const { ip } = await getRequestMeta();
    const { allowed } = rateLimit(`register:${ip}`, 8, 60 * 60 * 1000);
    if (!allowed) return apiError("Too many registration attempts. Please try again later.", 429);

    const body = schema.parse(await req.json());

    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing) {
      // Do not reveal whether the account exists.
      return apiOk({ message: "If this email can be used, a verification link has been sent." });
    }

    const passwordHash = await hashPassword(body.password);
    const user = await db.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        passwordHash,
        phone: body.phone || null,
        country: body.country,
      },
    });

    const rawToken = generateToken(32);
    await db.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${rawToken}`;
    await sendTemplatedEmail({
      to: user.email,
      templateKey: "welcome_verify_email",
      vars: { user_name: user.fullName, verify_url: verifyUrl },
    }).catch((err) => console.error("[register] email send failed", err));

    return apiOk({ message: "Account created. Please check your email to verify your address." });
  } catch (err) {
    return handleApiError(err);
  }
}
