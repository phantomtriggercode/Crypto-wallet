import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const templates = await db.emailTemplate.findMany({ orderBy: { key: "asc" } });
    return apiOk({ templates });
  } catch (err) {
    return handleApiError(err);
  }
}
