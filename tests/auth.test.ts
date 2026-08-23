import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { api, db, createVerifiedUser } from "./helpers";

describe("Registration and email verification", () => {
  it("registers a new user, who cannot log in until verified", async () => {
    const email = `test-flow-${Date.now()}@example.test`;
    const registerRes = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Flow Test",
        email,
        password: "FlowPass123!",
        confirmPassword: "FlowPass123!",
        country: "Testland",
      }),
    });
    expect(registerRes.status).toBe(200);

    const loginRes = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password: "FlowPass123!" }),
    });
    expect(loginRes.status).toBe(403);
    const body = await loginRes.json();
    expect(body.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("does not reveal whether an email is already registered", async () => {
    const { email } = await createVerifiedUser();
    const res = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        fullName: "Duplicate",
        email,
        password: "AnotherPass123!",
        confirmPassword: "AnotherPass123!",
        country: "Testland",
      }),
    });
    // Same generic success response as a fresh registration — no account-enumeration signal.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/verification link/i);
  });

  it("rejects an invalid verification token", async () => {
    const res = await api("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token: "a".repeat(64) }) });
    expect(res.status).toBe(400);
  });

  it("session cookie is httpOnly and SameSite=Lax", async () => {
    const { password, email } = await createVerifiedUser();
    const res = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    const raw = res.headers.get("set-cookie") ?? "";
    expect(raw.toLowerCase()).toContain("httponly");
    expect(raw.toLowerCase()).toContain("samesite=lax");
  });

  it("password reset invalidates all existing sessions", async () => {
    const { user, cookie } = await createVerifiedUser();

    // Session works before reset.
    const meBefore = await api("/api/auth/me", { cookie });
    expect(meBefore.status).toBe(200);

    const rawToken = `${Date.now()}-${Math.random()}`.padEnd(64, "b");
    // Mirrors src/lib/crypto.ts's hashToken() — that module can't be imported directly here
    // since it's marked "server-only" (a Next.js-bundler-only guard).
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await db.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + 60000) },
    });

    const confirmRes = await api("/api/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token: rawToken, password: "NewPass123!", confirmPassword: "NewPass123!" }),
    });
    expect(confirmRes.status).toBe(200);

    const meAfter = await api("/api/auth/me", { cookie });
    expect(meAfter.status).toBe(401);
  });
});

describe("Rate limiting", () => {
  it("locks out repeated failed logins for the same account", async () => {
    const { email } = await createVerifiedUser();
    const xff = "203.0.113.42"; // fixed, isolated fake IP for this test's own bucket

    let lastStatus = 0;
    for (let i = 0; i < 10; i++) {
      const res = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: "wrong-password" }),
        xff,
      });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});

describe("Session management", () => {
  it("a revoked session can no longer authenticate", async () => {
    const { cookie } = await createVerifiedUser();

    const sessionsRes = await api("/api/auth/sessions", { cookie });
    const { sessions } = (await sessionsRes.json()) as { sessions: { id: string; isCurrent: boolean }[] };
    const current = sessions.find((s) => s.isCurrent);
    expect(current).toBeTruthy();

    const revokeRes = await api(`/api/auth/sessions/${current!.id}`, { method: "DELETE", cookie });
    expect(revokeRes.status).toBe(200);

    const meRes = await api("/api/auth/me", { cookie });
    expect(meRes.status).toBe(401);
  });

  it("logging out clears the session cookie server-side", async () => {
    const { cookie } = await createVerifiedUser();
    await api("/api/auth/logout", { method: "POST", cookie });
    const meRes = await api("/api/auth/me", { cookie });
    expect(meRes.status).toBe(401);
  });
});
