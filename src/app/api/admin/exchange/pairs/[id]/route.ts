import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  buyRate: z.coerce.number().min(0).optional(),
  sellRate: z.coerce.number().min(0).optional(),
  spreadPercent: z.coerce.number().min(0).optional(),
  platformFeePercent: z.coerce.number().min(0).max(100).optional(),
  minAmount: z.coerce.number().min(0).optional(),
  maxAmount: z.coerce.number().min(0).optional(),
  enabled: z.boolean().optional(),
  requireManualApproval: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const before = await db.exchangePair.findUnique({ where: { id } });
    if (!before) return apiError("Trading pair not found.", 404);

    const changes = schema.parse(await req.json());
    const pair = await db.exchangePair.update({ where: { id }, data: changes });

    await writeAuditLog({ adminId: admin.id, action: "EXCHANGE_PAIR_UPDATED", targetType: "ExchangePair", targetId: id, previousState: before, newState: changes });

    return apiOk({ pair });
  } catch (err) {
    return handleApiError(err);
  }
}
