import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  symbol: z.string().trim().toUpperCase().min(1).max(15),
  name: z.string().trim().min(1).max(80),
  iconUrl: z.string().trim().max(500).optional().or(z.literal("")),
  decimals: z.coerce.number().int().min(0).max(18).default(8),
  demoPrice: z.coerce.number().min(0).default(0),
});

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Forbidden.", 403);

    const assets = await db.asset.findMany({ orderBy: { displayOrder: "asc" }, include: { networks: true } });
    return apiOk({ assets });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const body = schema.parse(await req.json());
    const existing = await db.asset.findUnique({ where: { symbol: body.symbol } });
    if (existing) return apiError("An asset with this symbol already exists.", 400);

    const count = await db.asset.count();
    const asset = await db.asset.create({
      data: { ...body, iconUrl: body.iconUrl || null, displayOrder: count },
    });

    await writeAuditLog({ adminId: admin.id, action: "ASSET_CREATED", targetType: "Asset", targetId: asset.id, newState: body });

    return apiOk({ asset }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
