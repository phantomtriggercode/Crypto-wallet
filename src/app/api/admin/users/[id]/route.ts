import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN", "KYC_ADMIN", "SUPPORT_ADMIN", "SECURITY_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const [user, balances, transactions, deposits, withdrawals, swaps, escrowDeals, kyc, sessions, auditLogs] = await Promise.all([
      db.user.findUnique({
        where: { id },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          country: true,
          status: true,
          emailVerifiedAt: true,
          isAdmin: true,
          adminRoles: true,
          kycStatus: true,
          twoFactorEnabled: true,
          depositsLocked: true,
          withdrawalsLocked: true,
          swapsLocked: true,
          escrowLocked: true,
          require2FA: true,
          requireKyc: true,
          internalNote: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
        },
      }),
      db.balance.findMany({ where: { userId: id }, include: { asset: true } }),
      db.ledgerEntry.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 25, include: { asset: true } }),
      db.deposit.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10, include: { asset: true } }),
      db.withdrawal.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10, include: { asset: true } }),
      db.swap.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 10, include: { fromAsset: true, toAsset: true } }),
      db.escrowDeal.findMany({ where: { OR: [{ buyerId: id }, { sellerId: id }] }, orderBy: { createdAt: "desc" }, take: 10 }),
      db.kycApplication.findFirst({ where: { userId: id }, orderBy: { createdAt: "desc" }, include: { documents: true } }),
      db.session.findMany({ where: { userId: id, revokedAt: null }, orderBy: { lastSeenAt: "desc" } }),
      db.auditLog.findMany({ where: { targetType: "User", targetId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

    if (!user) return apiError("User not found.", 404);

    return apiOk({ user, balances, transactions, deposits, withdrawals, swaps, escrowDeals, kyc, sessions, auditLogs });
  } catch (err) {
    return handleApiError(err);
  }
}
