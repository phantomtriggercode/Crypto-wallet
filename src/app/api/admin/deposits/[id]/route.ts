import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const deposit = await db.deposit.findUnique({
      where: { id },
      include: {
        asset: true,
        network: true,
        user: { select: { id: true, fullName: true, email: true, kycStatus: true, internalNote: true } },
      },
    });
    if (!deposit) return apiError("Deposit not found.", 404);

    const [previousDeposits, previousWithdrawals] = await Promise.all([
      db.deposit.findMany({ where: { userId: deposit.userId }, orderBy: { createdAt: "desc" }, take: 10 }),
      db.withdrawal.findMany({ where: { userId: deposit.userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    ]);

    return apiOk({ deposit, previousDeposits, previousWithdrawals });
  } catch (err) {
    return handleApiError(err);
  }
}
