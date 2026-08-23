import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(["SECURITY_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const url = new URL(req.url);
    const take = Math.min(Number(url.searchParams.get("take") ?? 100), 300);

    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: { admin: { select: { fullName: true, email: true } } },
    });

    return apiOk({ logs });
  } catch (err) {
    return handleApiError(err);
  }
}
