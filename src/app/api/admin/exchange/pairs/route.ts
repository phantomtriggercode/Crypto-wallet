import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  baseAssetId: z.string().min(1),
  quoteAssetId: z.string().min(1),
  buyRate: z.coerce.number().min(0),
  sellRate: z.coerce.number().min(0),
  spreadPercent: z.coerce.number().min(0).default(0),
  platformFeePercent: z.coerce.number().min(0).max(100).default(0),
  minAmount: z.coerce.number().min(0).default(0),
  maxAmount: z.coerce.number().min(0).default(0),
  requireManualApproval: z.boolean().default(false),
});

export async function GET() {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const pairs = await db.exchangePair.findMany({ include: { baseAsset: true, quoteAsset: true }, orderBy: { createdAt: "desc" } });
    return apiOk({ pairs });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const body = schema.parse(await req.json());
    const pair = await db.exchangePair.create({ data: body });

    await writeAuditLog({ adminId: admin.id, action: "EXCHANGE_PAIR_CREATED", targetType: "ExchangePair", targetId: pair.id, newState: body });

    return apiOk({ pair }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
