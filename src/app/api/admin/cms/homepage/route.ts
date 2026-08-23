import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { saveHomepageContent, HomepageContent } from "@/lib/cms";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const data = (await req.json()) as HomepageContent;
    await saveHomepageContent(data);
    await writeAuditLog({ adminId: admin.id, action: "CMS_HOMEPAGE_UPDATED", targetType: "CmsSection", targetId: "homepage/content" });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
