import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({ subject: z.string().trim().min(1).max(200), bodyHtml: z.string().trim().min(1) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const { subject, bodyHtml } = schema.parse(await req.json());
    const template = await db.emailTemplate.update({ where: { id }, data: { subject, bodyHtml } });

    await writeAuditLog({ adminId: admin.id, action: "EMAIL_TEMPLATE_UPDATED", targetType: "EmailTemplate", targetId: id });

    return apiOk({ template });
  } catch (err) {
    return handleApiError(err);
  }
}
