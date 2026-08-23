import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { postLedgerEntry } from "@/lib/ledger";
import { writeAuditLog } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

const schema = z.object({ reason: z.string().trim().min(3).max(500) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ entryId: string }> }) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { entryId } = await params;
    const original = await db.ledgerEntry.findUnique({ where: { id: entryId }, include: { asset: true } });
    if (!original) return apiError("Ledger entry not found.", 404);

    const { reason } = schema.parse(await req.json());
    const reversedDirection = original.direction === "CREDIT" ? "DEBIT" : "CREDIT";

    const entry = await db.$transaction((tx) =>
      postLedgerEntry(tx, {
        userId: original.userId,
        assetId: original.assetId,
        type: "REVERSAL",
        direction: reversedDirection,
        amount: original.amount,
        referenceType: "Reversal",
        referenceId: original.id,
        reason,
        createdByAdminId: admin.id,
      })
    );

    await writeAuditLog({
      adminId: admin.id,
      action: "LEDGER_REVERSAL",
      targetType: "LedgerEntry",
      targetId: original.id,
      previousState: { type: original.type, direction: original.direction, amount: original.amount.toString() },
      newState: { reversalEntryId: entry.id },
      reason,
    });

    await notifyUser({
      userId: original.userId,
      type: "MANUAL_ADJUSTMENT",
      title: "Transaction reversed",
      message: `A previous ${original.type.replaceAll("_", " ").toLowerCase()} of ${original.amount} ${original.asset.symbol} was reversed. Reason: ${reason}`,
    });

    return apiOk({ entry }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
