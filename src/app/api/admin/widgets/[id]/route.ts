import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  title: z.string().trim().max(100).nullable().optional(),
  enabled: z.boolean().optional(),
  order: z.number().int().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const before = await db.widget.findUnique({ where: { id } });
    if (!before) return apiError("Widget not found.", 404);

    const changes = schema.parse(await req.json());
    const widget = await db.widget.update({ where: { id }, data: { ...changes, config: changes.config as object | undefined } });

    await writeAuditLog({ adminId: admin.id, action: "WIDGET_UPDATED", targetType: "Widget", targetId: id, previousState: before, newState: changes });

    return apiOk({ widget });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    await db.widget.delete({ where: { id } });
    await writeAuditLog({ adminId: admin.id, action: "WIDGET_DELETED", targetType: "Widget", targetId: id });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
