import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { postLedgerEntry } from "@/lib/ledger";
import { writeAuditLog } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT", "UNDER_REVIEW", "NOTE"]),
  adminNote: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const deposit = await db.deposit.findUnique({ where: { id }, include: { asset: true } });
    if (!deposit) return apiError("Deposit not found.", 404);

    const { action, adminNote } = schema.parse(await req.json());

    if (action === "NOTE") {
      await db.deposit.update({ where: { id }, data: { adminNote } });
      return apiOk({});
    }

    if (deposit.status === "CREDITED" || deposit.status === "REJECTED") {
      return apiError("This deposit has already been finalized.", 400);
    }

    if (action === "UNDER_REVIEW") {
      await db.deposit.update({ where: { id }, data: { status: "UNDER_REVIEW", adminNote: adminNote || deposit.adminNote } });
      await writeAuditLog({
        adminId: admin.id,
        action: "DEPOSIT_UNDER_REVIEW",
        targetType: "Deposit",
        targetId: id,
        previousState: { status: deposit.status },
        newState: { status: "UNDER_REVIEW" },
      });
      return apiOk({});
    }

    if (action === "REJECT") {
      await db.$transaction([
        db.deposit.update({ where: { id }, data: { status: "REJECTED", adminNote: adminNote || deposit.adminNote, reviewedByAdminId: admin.id, reviewedAt: new Date() } }),
      ]);
      await writeAuditLog({
        adminId: admin.id,
        action: "DEPOSIT_REJECTED",
        targetType: "Deposit",
        targetId: id,
        previousState: { status: deposit.status },
        newState: { status: "REJECTED" },
        reason: adminNote,
      });
      await notifyUser({
        userId: deposit.userId,
        type: "DEPOSIT",
        title: "Deposit rejected",
        message: `Your deposit of ${deposit.amount} ${deposit.asset.symbol} was rejected.${adminNote ? ` Reason: ${adminNote}` : ""}`,
        emailTemplateKey: "deposit_rejected",
        emailVars: { amount: deposit.amount.toString(), asset: deposit.asset.symbol },
      });
      return apiOk({});
    }

    // APPROVE — credits the ledger and marks the deposit CREDITED.
    await db.$transaction(async (tx) => {
      await postLedgerEntry(tx, {
        userId: deposit.userId,
        assetId: deposit.assetId,
        type: "DEPOSIT",
        direction: "CREDIT",
        amount: deposit.amount,
        referenceType: "Deposit",
        referenceId: deposit.id,
        reason: `Deposit ${deposit.depositRef} approved`,
        createdByAdminId: admin.id,
      });
      await tx.deposit.update({
        where: { id },
        data: { status: "CREDITED", adminNote: adminNote || deposit.adminNote, reviewedByAdminId: admin.id, reviewedAt: new Date() },
      });
    });

    await writeAuditLog({
      adminId: admin.id,
      action: "DEPOSIT_APPROVED",
      targetType: "Deposit",
      targetId: id,
      previousState: { status: deposit.status },
      newState: { status: "CREDITED", amount: deposit.amount.toString() },
      reason: adminNote,
    });

    await notifyUser({
      userId: deposit.userId,
      type: "DEPOSIT",
      title: "Deposit confirmed",
      message: `Your deposit of ${deposit.amount} ${deposit.asset.symbol} has been confirmed and credited to your wallet.`,
      emailTemplateKey: "deposit_approved",
      emailVars: { amount: deposit.amount.toString(), asset: deposit.asset.symbol },
    });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
