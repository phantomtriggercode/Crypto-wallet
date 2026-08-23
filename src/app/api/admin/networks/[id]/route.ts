import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  depositAddress: z.string().trim().min(4).max(200).optional(),
  minDeposit: z.coerce.number().min(0).optional(),
  confirmationTimerMinutes: z.coerce.number().int().min(1).optional(),
  enabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const before = await db.network.findUnique({ where: { id } });
    if (!before) return apiError("Network not found.", 404);

    const changes = schema.parse(await req.json());

    const network = await db.$transaction(async (tx) => {
      if (changes.isDefault) {
        await tx.network.updateMany({ where: { assetId: before.assetId }, data: { isDefault: false } });
      }
      return tx.network.update({ where: { id }, data: changes });
    });

    await writeAuditLog({
      adminId: admin.id,
      action: "NETWORK_UPDATED",
      targetType: "Network",
      targetId: id,
      previousState: { depositAddress: before.depositAddress, enabled: before.enabled },
      newState: changes,
    });

    return apiOk({ network });
  } catch (err) {
    return handleApiError(err);
  }
}
