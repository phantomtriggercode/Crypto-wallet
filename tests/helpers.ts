import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BASE_URL } from "./global-setup";

export const db = new PrismaClient();

function randomSuffix() {
  return Math.random().toString(36).slice(2, 10);
}

export function extractCookie(res: Response): string {
  const raw = res.headers.get("set-cookie");
  if (!raw) throw new Error("No Set-Cookie header in response");
  // Only the cookie name=value pair is needed for subsequent requests.
  return raw.split(";")[0];
}

export async function api(path: string, init?: RequestInit & { cookie?: string; xff?: string }) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (init?.cookie) headers.set("Cookie", init.cookie);
  if (init?.xff) headers.set("X-Forwarded-For", init.xff);
  return fetch(`${BASE_URL}${path}`, { ...init, headers, redirect: "manual" });
}

/** A fresh per-call fake IP, so helper-driven logins never contend with the dedicated rate-limit test's bucket. */
function freshIp() {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

/** Creates a fully verified normal user directly in the DB (bypassing email verification) and logs them in. */
export async function createVerifiedUser(opts: { password?: string } = {}) {
  const email = `test-user-${randomSuffix()}@example.test`;
  const password = opts.password ?? "TestPass123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      fullName: "Test User",
      email,
      passwordHash,
      country: "Testland",
      emailVerifiedAt: new Date(),
    },
  });

  const loginRes = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }), xff: freshIp() });
  const cookie = extractCookie(loginRes);

  return { user, email, password, cookie };
}

/** Creates an admin user with the given roles and logs them in. */
export async function createAdmin(roles: string[]) {
  const email = `test-admin-${randomSuffix()}@example.test`;
  const password = "AdminPass123!";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await db.user.create({
    data: {
      fullName: "Test Admin",
      email,
      passwordHash,
      isAdmin: true,
      emailVerifiedAt: new Date(),
      kycStatus: "APPROVED",
      adminRoles: { create: roles.map((role) => ({ role: role as never })) },
    },
  });

  const loginRes = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }), xff: freshIp() });
  const cookie = extractCookie(loginRes);

  return { user, email, password, cookie };
}

export async function getFirstEnabledAsset() {
  const asset = await db.asset.findFirstOrThrow({ where: { enabled: true } });
  return asset;
}

/** Best-effort cleanup — test users that triggered financial activity may be FK-referenced and are left in place. */
export async function cleanupTestUsers() {
  try {
    await db.user.deleteMany({ where: { email: { contains: "@example.test" } } });
  } catch {
    // Leftover test rows in the local dev database are harmless; ignore FK-restricted deletes.
  }
}
