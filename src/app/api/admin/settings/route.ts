import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { getSettings, updateSettings } from "@/lib/settings";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Forbidden.", 403);
    const settings = await getSettings();
    return apiOk({ settings });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "CONTENT_ADMIN", "FINANCE_ADMIN", "SECURITY_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const changes = await req.json();
    await updateSettings(changes);
    await writeAuditLog({ adminId: admin.id, action: "SETTINGS_UPDATED", targetType: "SystemSetting", newState: changes });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
