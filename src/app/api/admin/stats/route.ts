import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Forbidden.", 403);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      verifiedUsers,
      pendingKyc,
      depositsToday,
      withdrawalsToday,
      pendingDeposits,
      pendingWithdrawals,
      openDisputes,
      balances,
      swapsToday,
      escrowDeals,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { emailVerifiedAt: { not: null } } }),
      db.kycApplication.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
      db.deposit.count({ where: { createdAt: { gte: startOfDay } } }),
      db.withdrawal.count({ where: { createdAt: { gte: startOfDay } } }),
      db.deposit.count({ where: { status: { in: ["PENDING_REVIEW", "UNDER_REVIEW"] } } }),
      db.withdrawal.count({ where: { status: "PENDING_APPROVAL" } }),
      db.escrowDispute.count({ where: { status: "OPEN" } }),
      db.balance.findMany({ include: { asset: true } }),
      db.swap.count({ where: { createdAt: { gte: startOfDay } } }),
      db.escrowDeal.aggregate({ _sum: { amount: true }, where: { status: { in: ["FUNDED", "SELLER_COMPLETED", "AWAITING_ADMIN_RELEASE"] } } }),
    ]);

    const totalDemoBalanceUsd = balances.reduce(
      (sum, b) => sum.add(b.available.add(b.locked).mul(b.asset.demoPrice)),
      new Prisma.Decimal(0)
    );

    return apiOk({
      totalUsers,
      verifiedUsers,
      pendingKyc,
      depositsToday,
      withdrawalsToday,
      pendingDeposits,
      pendingWithdrawals,
      openDisputes,
      swapsToday,
      totalDemoBalanceUsd: totalDemoBalanceUsd.toString(),
      escrowVolume: (escrowDeals._sum.amount ?? new Prisma.Decimal(0)).toString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
