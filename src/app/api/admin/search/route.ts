import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Forbidden.", 403);

    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) {
      return apiOk({ users: [], deposits: [], withdrawals: [], kyc: [], transactions: [], escrow: [], auditLogs: [] });
    }

    const [users, deposits, withdrawals, kyc, transactions, escrow, auditLogs] = await Promise.all([
      db.user.findMany({
        where: { OR: [{ fullName: { contains: q } }, { email: { contains: q } }] },
        take: 5,
        select: { id: true, fullName: true, email: true },
      }),
      db.deposit.findMany({
        where: { OR: [{ depositRef: { contains: q } }, { user: { email: { contains: q } } }] },
        take: 5,
        include: { asset: true, user: { select: { email: true } } },
      }),
      db.withdrawal.findMany({
        where: { OR: [{ withdrawalRef: { contains: q } }, { user: { email: { contains: q } } }] },
        take: 5,
        include: { asset: true, user: { select: { email: true } } },
      }),
      db.kycApplication.findMany({
        where: { OR: [{ legalName: { contains: q } }, { user: { email: { contains: q } } }] },
        take: 5,
        include: { user: { select: { email: true } } },
      }),
      db.ledgerEntry.findMany({
        where: { OR: [{ reason: { contains: q } }, { user: { email: { contains: q } } }] },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { asset: true, user: { select: { email: true } } },
      }),
      db.escrowDeal.findMany({
        where: { OR: [{ title: { contains: q } }, { escrowRef: { contains: q } }] },
        take: 5,
      }),
      db.auditLog.findMany({
        where: { action: { contains: q } },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return apiOk({ users, deposits, withdrawals, kyc, transactions, escrow, auditLogs });
  } catch (err) {
    return handleApiError(err);
  }
}
