import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { listStaticPages } from "@/lib/cms";

export async function GET() {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const pages = await listStaticPages();
    return apiOk({ pages });
  } catch (err) {
    return handleApiError(err);
  }
}
