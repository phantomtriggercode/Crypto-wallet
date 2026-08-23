import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { postLedgerEntry } from "@/lib/ledger";
import { writeAuditLog } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { generateRef } from "@/lib/ref";
import { Prisma } from "@prisma/client";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT", "ON_HOLD", "MORE_INFO_REQUIRED"]),
  adminNote: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const withdrawal = await db.withdrawal.findUnique({ where: { id }, include: { asset: true } });
    if (!withdrawal) return apiError("Withdrawal not found.", 404);
    if (["APPROVED", "REJECTED", "COMPLETED"].includes(withdrawal.status)) {
      return apiError("This withdrawal has already been finalized.", 400);
    }

    const { action, adminNote } = schema.parse(await req.json());

    if (action === "ON_HOLD" || action === "MORE_INFO_REQUIRED") {
      await db.withdrawal.update({
        where: { id },
        data: { status: action, adminNote: adminNote || withdrawal.adminNote },
      });
      await writeAuditLog({
        adminId: admin.id,
        action: `WITHDRAWAL_${action}`,
        targetType: "Withdrawal",
        targetId: id,
        previousState: { status: withdrawal.status },
        newState: { status: action },
        reason: adminNote,
      });
      await notifyUser({
        userId: withdrawal.userId,
        type: "WITHDRAWAL",
        title: action === "ON_HOLD" ? "Withdrawal on hold" : "More information required",
        message: adminNote || "Please check your withdrawal for updates.",
      });
      return apiOk({});
    }

    if (action === "REJECT") {
      await db.withdrawal.update({
        where: { id },
        data: { status: "REJECTED", adminNote: adminNote || withdrawal.adminNote, reviewedByAdminId: admin.id, reviewedAt: new Date() },
      });
      await writeAuditLog({
        adminId: admin.id,
        action: "WITHDRAWAL_REJECTED",
        targetType: "Withdrawal",
        targetId: id,
        previousState: { status: withdrawal.status },
        newState: { status: "REJECTED" },
        reason: adminNote,
      });
      await notifyUser({
        userId: withdrawal.userId,
        type: "WITHDRAWAL",
        title: "Withdrawal rejected",
        message: `Your withdrawal of ${withdrawal.amount} ${withdrawal.asset.symbol} was rejected.${adminNote ? ` Reason: ${adminNote}` : ""}`,
        emailTemplateKey: "withdrawal_rejected",
        emailVars: { amount: withdrawal.amount.toString(), asset: withdrawal.asset.symbol },
      });
      return apiOk({});
    }

    // APPROVE — deducts the ledger (amount + fees) and marks the withdrawal approved.
    const internalTxReference = generateRef("TXN");
    await db.$transaction(async (tx) => {
      const totalDeducted = new Prisma.Decimal(withdrawal.amount).add(withdrawal.platformFee).add(withdrawal.networkFee);
      await postLedgerEntry(tx, {
        userId: withdrawal.userId,
        assetId: withdrawal.assetId,
        type: "WITHDRAWAL",
        direction: "DEBIT",
        amount: withdrawal.amount,
        referenceType: "Withdrawal",
        referenceId: withdrawal.id,
        reason: `Withdrawal ${withdrawal.withdrawalRef} approved`,
        createdByAdminId: admin.id,
      });
      if (totalDeducted.sub(withdrawal.amount).greaterThan(0)) {
        await postLedgerEntry(tx, {
          userId: withdrawal.userId,
          assetId: withdrawal.assetId,
          type: "FEE",
          direction: "DEBIT",
          amount: totalDeducted.sub(withdrawal.amount),
          referenceType: "Withdrawal",
          referenceId: withdrawal.id,
          reason: `Withdrawal fee for ${withdrawal.withdrawalRef}`,
          createdByAdminId: admin.id,
        });
      }
      await tx.withdrawal.update({
        where: { id },
        data: {
          status: "APPROVED",
          adminNote: adminNote || withdrawal.adminNote,
          reviewedByAdminId: admin.id,
          reviewedAt: new Date(),
          internalTxReference,
        },
      });
    });

    await writeAuditLog({
      adminId: admin.id,
      action: "WITHDRAWAL_APPROVED",
      targetType: "Withdrawal",
      targetId: id,
      previousState: { status: withdrawal.status },
      newState: { status: "APPROVED", internalTxReference },
      reason: adminNote,
    });

    await notifyUser({
      userId: withdrawal.userId,
      type: "WITHDRAWAL",
      title: "Withdrawal approved",
      message: `Your withdrawal of ${withdrawal.amount} ${withdrawal.asset.symbol} has been approved. Internal reference: ${internalTxReference}`,
      emailTemplateKey: "withdrawal_approved",
      emailVars: { amount: withdrawal.amount.toString(), asset: withdrawal.asset.symbol, reference: internalTxReference },
    });

    return apiOk({ internalTxReference });
  } catch (err) {
    return handleApiError(err);
  }
}
