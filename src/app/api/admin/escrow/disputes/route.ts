import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "OPEN";

    const disputes = await db.escrowDispute.findMany({
      where: { status: status as never },
      orderBy: { createdAt: "desc" },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        escrowDeal: {
          include: { asset: true, buyer: { select: { fullName: true, email: true } }, seller: { select: { fullName: true, email: true } } },
        },
      },
    });

    return apiOk({ disputes });
  } catch (err) {
    return handleApiError(err);
  }
}
