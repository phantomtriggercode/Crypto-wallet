import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { postLedgerEntry } from "@/lib/ledger";
import { writeAuditLog } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

const schema = z.object({
  userId: z.string().min(1),
  assetId: z.string().min(1),
  action: z.enum(["CREDIT", "DEBIT"]),
  amount: z.coerce.number().positive(),
  reason: z.string().trim().min(3).max(500),
  internalNote: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const take = Math.min(Number(url.searchParams.get("take") ?? 30), 100);

    const entries = await db.ledgerEntry.findMany({
      where: userId ? { userId } : { type: { in: ["MANUAL_CREDIT", "MANUAL_DEBIT", "REVERSAL"] } },
      orderBy: { createdAt: "desc" },
      take,
      include: { asset: true, user: { select: { fullName: true, email: true } } },
    });

    return apiOk({ entries });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const body = schema.parse(await req.json());
    const [user, asset] = await Promise.all([
      db.user.findUnique({ where: { id: body.userId } }),
      db.asset.findUnique({ where: { id: body.assetId } }),
    ]);
    if (!user) return apiError("User not found.", 404);
    if (!asset) return apiError("Asset not found.", 404);

    const balanceBefore = await db.balance.findUnique({
      where: { userId_assetId: { userId: body.userId, assetId: body.assetId } },
    });

    const entry = await db.$transaction((tx) =>
      postLedgerEntry(tx, {
        userId: body.userId,
        assetId: body.assetId,
        type: body.action === "CREDIT" ? "MANUAL_CREDIT" : "MANUAL_DEBIT",
        direction: body.action === "CREDIT" ? "CREDIT" : "DEBIT",
        amount: body.amount,
        referenceType: "Manual",
        reason: body.reason,
        internalNote: body.internalNote || null,
        createdByAdminId: admin.id,
      })
    );

    await writeAuditLog({
      adminId: admin.id,
      action: `LEDGER_${body.action}`,
      targetType: "User",
      targetId: user.id,
      previousState: { balance: balanceBefore?.available.toString() ?? "0" },
      newState: { balance: entry.balanceAfter.toString() },
      reason: body.reason,
    });

    await notifyUser({
      userId: user.id,
      type: "MANUAL_ADJUSTMENT",
      title: `Balance ${body.action === "CREDIT" ? "credited" : "debited"}`,
      message: `An administrator ${body.action === "CREDIT" ? "credited" : "debited"} ${body.amount} ${asset.symbol} to your account. Reason: ${body.reason}`,
    });

    return apiOk({ entry }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
