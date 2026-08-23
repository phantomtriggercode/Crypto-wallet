import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const take = Math.min(Number(url.searchParams.get("take") ?? 50), 200);

    const deposits = await db.deposit.findMany({
      where: status ? { status: status as never } : {},
      orderBy: { createdAt: "desc" },
      take,
      include: { asset: true, network: true, user: { select: { id: true, fullName: true, email: true, kycStatus: true } } },
    });

    return apiOk({ deposits });
  } catch (err) {
    return handleApiError(err);
  }
}
