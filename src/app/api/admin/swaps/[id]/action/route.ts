import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { postLedgerEntry } from "@/lib/ledger";
import { writeAuditLog } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

const schema = z.object({ action: z.enum(["APPROVE", "REJECT"]), adminNote: z.string().trim().max(1000).optional().or(z.literal("")) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const swap = await db.swap.findUnique({ where: { id }, include: { fromAsset: true, toAsset: true } });
    if (!swap) return apiError("Swap not found.", 404);
    if (swap.status !== "PENDING") return apiError("This swap has already been processed.", 400);

    const { action, adminNote } = schema.parse(await req.json());

    if (action === "REJECT") {
      await db.swap.update({ where: { id }, data: { status: "REJECTED", adminNote, reviewedByAdminId: admin.id } });
      await writeAuditLog({ adminId: admin.id, action: "SWAP_REJECTED", targetType: "Swap", targetId: id, reason: adminNote });
      await notifyUser({ userId: swap.userId, type: "SWAP", title: "Swap rejected", message: `Your swap request was rejected.${adminNote ? ` Reason: ${adminNote}` : ""}` });
      return apiOk({});
    }

    await db.$transaction(async (tx) => {
      await postLedgerEntry(tx, {
        userId: swap.userId,
        assetId: swap.fromAssetId,
        type: "SWAP_DEBIT",
        direction: "DEBIT",
        amount: swap.fromAmount,
        referenceType: "Swap",
        referenceId: swap.id,
        reason: `Swap ${swap.fromAsset.symbol} → ${swap.toAsset.symbol} approved`,
        createdByAdminId: admin.id,
      });
      await postLedgerEntry(tx, {
        userId: swap.userId,
        assetId: swap.toAssetId,
        type: "SWAP_CREDIT",
        direction: "CREDIT",
        amount: swap.toAmount,
        referenceType: "Swap",
        referenceId: swap.id,
        reason: `Swap ${swap.fromAsset.symbol} → ${swap.toAsset.symbol} approved`,
        createdByAdminId: admin.id,
      });
      await tx.swap.update({ where: { id }, data: { status: "COMPLETED", adminNote, reviewedByAdminId: admin.id } });
    });

    await writeAuditLog({ adminId: admin.id, action: "SWAP_APPROVED", targetType: "Swap", targetId: id, reason: adminNote });
    await notifyUser({
      userId: swap.userId,
      type: "SWAP",
      title: "Swap completed",
      message: `Your swap of ${swap.fromAmount} ${swap.fromAsset.symbol} to ${swap.toAsset.symbol} has been approved and completed.`,
      emailTemplateKey: "swap_completed",
      emailVars: { amount: swap.fromAmount.toString(), asset: swap.fromAsset.symbol },
    });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
