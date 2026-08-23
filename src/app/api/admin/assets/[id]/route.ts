import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  iconUrl: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  decimals: z.coerce.number().int().min(0).max(18).optional(),
  enabled: z.boolean().optional(),
  depositEnabled: z.boolean().optional(),
  withdrawalEnabled: z.boolean().optional(),
  swapEnabled: z.boolean().optional(),
  escrowEnabled: z.boolean().optional(),
  displayOrder: z.coerce.number().int().optional(),
  demoPrice: z.coerce.number().min(0).optional(),
  priceChange24h: z.coerce.number().optional(),
  marketCap: z.coerce.number().min(0).optional(),
  volume24h: z.coerce.number().min(0).optional(),
  priceMode: z.enum(["MANUAL", "LIVE"]).optional(),
  minDeposit: z.coerce.number().min(0).optional(),
  minWithdrawal: z.coerce.number().min(0).optional(),
  depositFeeFixed: z.coerce.number().min(0).optional(),
  withdrawalFeeFixed: z.coerce.number().min(0).optional(),
  withdrawalFeePercent: z.coerce.number().min(0).max(100).optional(),
  swapFeePercent: z.coerce.number().min(0).max(100).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const before = await db.asset.findUnique({ where: { id } });
    if (!before) return apiError("Asset not found.", 404);

    const changes = schema.parse(await req.json());
    const asset = await db.asset.update({ where: { id }, data: changes });

    if (changes.demoPrice !== undefined) {
      await db.priceHistory.create({ data: { assetId: id, price: changes.demoPrice } });
    }

    await writeAuditLog({
      adminId: admin.id,
      action: "ASSET_UPDATED",
      targetType: "Asset",
      targetId: id,
      previousState: before,
      newState: changes,
    });

    return apiOk({ asset });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["SUPER_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    await db.asset.update({ where: { id }, data: { enabled: false, depositEnabled: false, withdrawalEnabled: false, swapEnabled: false } });
    await writeAuditLog({ adminId: admin.id, action: "ASSET_DISABLED", targetType: "Asset", targetId: id });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
