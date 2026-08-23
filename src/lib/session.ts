import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { generateToken, hashToken } from "@/lib/crypto";

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET env var is not set");
  return new TextEncoder().encode(secret);
}

type SessionPayload = { sid: string };

async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getRequestMeta() {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown";
  const userAgent = h.get("user-agent") ?? "unknown";
  return { ip, userAgent };
}

/** Creates a database-backed session and sets the httpOnly session cookie. */
export async function createSession(userId: string) {
  const { ip, userAgent } = await getRequestMeta();
  const rawSessionId = generateToken(32);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const session = await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawSessionId),
      ip,
      userAgent,
      expiresAt,
    },
  });

  const jwt = await encrypt({ sid: session.id + "." + rawSessionId });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return session;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = await decrypt(raw);
  if (payload?.sid) {
    const [sessionId] = payload.sid.split(".");
    await db.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    }).catch(() => undefined);
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** Verifies the session cookie against the database. Memoized per request. */
export const getCurrentSession = cache(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = await decrypt(raw);
  if (!payload?.sid) return null;

  const [sessionId, secret] = payload.sid.split(".");
  if (!sessionId || !secret) return null;

  const session = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: { include: { adminRoles: true } } },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  if (session.tokenHash !== hashToken(secret)) return null;
  if (session.user.status === "SUSPENDED") return null;

  db.session
    .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined);

  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await getCurrentSession();
  return session?.user ?? null;
});

/** Throws-free guard for use in Route Handlers / Server Components. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user;
}

const PENDING_2FA_COOKIE = "twofa_pending";

/** Short-lived signed cookie used between password verification and 2FA code verification. */
export async function createPending2FACookie(userId: string) {
  const jwt = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secretKey());
  const cookieStore = await cookies();
  cookieStore.set(PENDING_2FA_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 5 * 60,
    path: "/",
  });
}

export async function readPending2FACookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_2FA_COOKIE)?.value;
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, secretKey(), { algorithms: ["HS256"] });
    return (payload as { uid?: string }).uid ?? null;
  } catch {
    return null;
  }
}

export async function clearPending2FACookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PENDING_2FA_COOKIE);
}

export async function requireAdmin(allowedRoles?: string[]) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) return null;
  if (!allowedRoles || allowedRoles.length === 0) return user;
  const roles = user.adminRoles.map((r) => r.role);
  if (roles.includes("SUPER_ADMIN")) return user;
  if (roles.some((r) => allowedRoles.includes(r))) return user;
  return null;
}
