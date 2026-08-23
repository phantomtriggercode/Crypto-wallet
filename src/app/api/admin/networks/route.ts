import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  assetId: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  symbol: z.string().trim().min(1).max(30),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  depositAddress: z.string().trim().min(4).max(200),
  minDeposit: z.coerce.number().min(0).default(0),
  confirmationTimerMinutes: z.coerce.number().int().min(1).default(30),
  isDefault: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const body = schema.parse(await req.json());
    const network = await db.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.network.updateMany({ where: { assetId: body.assetId }, data: { isDefault: false } });
      }
      return tx.network.create({ data: { ...body, description: body.description || null } });
    });

    await writeAuditLog({ adminId: admin.id, action: "NETWORK_CREATED", targetType: "Network", targetId: network.id, newState: body });

    return apiOk({ network }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
