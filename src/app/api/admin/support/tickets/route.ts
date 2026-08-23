import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(["SUPPORT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const url = new URL(req.url);
    const status = url.searchParams.get("status");

    const tickets = await db.supportTicket.findMany({
      where: status ? { status: status as never } : {},
      orderBy: { updatedAt: "desc" },
      include: { user: { select: { fullName: true, email: true } } },
    });

    return apiOk({ tickets });
  } catch (err) {
    return handleApiError(err);
  }
}
