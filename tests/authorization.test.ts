import { describe, it, expect } from "vitest";
import { api, createVerifiedUser, createAdmin, getFirstEnabledAsset, db } from "./helpers";

describe("Authorization boundaries", () => {
  it("a normal user cannot call an admin endpoint", async () => {
    const { cookie } = await createVerifiedUser();

    const res = await api("/api/admin/users", { cookie });
    expect(res.status).toBe(403);
  });

  it("an unauthenticated request cannot call an admin endpoint", async () => {
    const res = await api("/api/admin/users");
    expect(res.status).toBe(403);
  });

  it("a normal user cannot credit their own (or anyone's) ledger via the manual adjustment endpoint", async () => {
    const { cookie, user } = await createVerifiedUser();
    const asset = await getFirstEnabledAsset();

    const res = await api("/api/admin/ledger", {
      method: "POST",
      cookie,
      body: JSON.stringify({ userId: user.id, assetId: asset.id, action: "CREDIT", amount: 1000, reason: "self credit attempt" }),
    });

    expect(res.status).toBe(403);

    const balance = await db.balance.findUnique({ where: { userId_assetId: { userId: user.id, assetId: asset.id } } });
    expect(balance?.available.toString() ?? "0").toBe("0");
  });

  it("there is no user-facing endpoint that writes ledger entries directly", async () => {
    // The only ledger-writing paths are: approval routes (deposit/withdrawal/swap/escrow) and
    // /api/admin/ledger — all admin-gated. A plain user must never be able to POST a ledger entry.
    const { cookie } = await createVerifiedUser();
    const res = await api("/api/ledger", { method: "POST", cookie, body: JSON.stringify({}) });
    expect([404, 405]).toContain(res.status);
  });

  it("a CONTENT_ADMIN cannot approve withdrawals", async () => {
    const { cookie: contentCookie } = await createAdmin(["CONTENT_ADMIN"]);
    const { cookie: financeCookie, user: financeUser } = await createAdmin(["FINANCE_ADMIN"]);
    const { user: targetUser } = await createVerifiedUser();
    const asset = await getFirstEnabledAsset();

    // Fund the target user via a legitimate finance-admin credit so a withdrawal can exist.
    await api("/api/admin/ledger", {
      method: "POST",
      cookie: financeCookie,
      body: JSON.stringify({ userId: targetUser.id, assetId: asset.id, action: "CREDIT", amount: 100, reason: "test funding" }),
    });

    const withdrawal = await db.withdrawal.create({
      data: {
        withdrawalRef: `TEST-${Date.now()}`,
        userId: targetUser.id,
        assetId: asset.id,
        networkId: (await db.network.findFirstOrThrow({ where: { assetId: asset.id } })).id,
        destinationAddress: "test-address",
        amount: 10,
        totalDeducted: 10,
      },
    });

    const res = await api(`/api/admin/withdrawals/${withdrawal.id}/action`, {
      method: "POST",
      cookie: contentCookie,
      body: JSON.stringify({ action: "APPROVE" }),
    });
    expect(res.status).toBe(403);

    const reloaded = await db.withdrawal.findUniqueOrThrow({ where: { id: withdrawal.id } });
    expect(reloaded.status).toBe("PENDING_APPROVAL");

    void financeUser;
  });

  it("a KYC_ADMIN cannot credit or debit balances", async () => {
    const { cookie: kycCookie } = await createAdmin(["KYC_ADMIN"]);
    const { user: targetUser } = await createVerifiedUser();
    const asset = await getFirstEnabledAsset();

    const res = await api("/api/admin/ledger", {
      method: "POST",
      cookie: kycCookie,
      body: JSON.stringify({ userId: targetUser.id, assetId: asset.id, action: "CREDIT", amount: 500, reason: "kyc admin overreach" }),
    });
    expect(res.status).toBe(403);
  });

  it("a KYC_ADMIN cannot approve deposits", async () => {
    const { cookie: kycCookie } = await createAdmin(["KYC_ADMIN"]);
    const { user: targetUser } = await createVerifiedUser();
    const asset = await getFirstEnabledAsset();
    const network = await db.network.findFirstOrThrow({ where: { assetId: asset.id } });

    const deposit = await db.deposit.create({
      data: {
        depositRef: `TEST-${Date.now()}`,
        userId: targetUser.id,
        assetId: asset.id,
        networkId: network.id,
        amount: 5,
        receivingAddress: network.depositAddress,
      },
    });

    const res = await api(`/api/admin/deposits/${deposit.id}/action`, {
      method: "POST",
      cookie: kycCookie,
      body: JSON.stringify({ action: "APPROVE" }),
    });
    expect(res.status).toBe(403);
  });

  it("a CONTENT_ADMIN cannot approve KYC applications", async () => {
    const { cookie: contentCookie } = await createAdmin(["CONTENT_ADMIN"]);
    const { user: targetUser } = await createVerifiedUser();

    const application = await db.kycApplication.create({
      data: {
        userId: targetUser.id,
        legalName: "Test Person",
        dateOfBirth: new Date("1990-01-01"),
        country: "Testland",
        address: "1 Test St",
        status: "UNDER_REVIEW",
      },
    });

    const res = await api(`/api/admin/kyc/${application.id}/action`, {
      method: "POST",
      cookie: contentCookie,
      body: JSON.stringify({ action: "APPROVE" }),
    });
    expect(res.status).toBe(403);
  });

  it("a FINANCE_ADMIN cannot manage other administrators' roles (SUPER_ADMIN only)", async () => {
    const { cookie: financeCookie } = await createAdmin(["FINANCE_ADMIN"]);
    const { user: otherAdmin } = await createAdmin(["SUPPORT_ADMIN"]);

    const res = await api(`/api/admin/admins/${otherAdmin.id}/roles`, {
      method: "PATCH",
      cookie: financeCookie,
      body: JSON.stringify({ roles: ["SUPER_ADMIN"] }),
    });
    expect(res.status).toBe(403);
  });

  it("a SUPER_ADMIN can perform finance actions (roles are additive, not exclusive)", async () => {
    const { cookie: superCookie } = await createAdmin(["SUPER_ADMIN"]);
    const { user: targetUser } = await createVerifiedUser();
    const asset = await getFirstEnabledAsset();

    const res = await api("/api/admin/ledger", {
      method: "POST",
      cookie: superCookie,
      body: JSON.stringify({ userId: targetUser.id, assetId: asset.id, action: "CREDIT", amount: 1, reason: "super admin sanity check" }),
    });
    expect(res.status).toBe(201);
  });
});
