import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { WIDGET_TYPES, WIDGET_TYPE_INFO } from "@/lib/widgets";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  type: z.enum(WIDGET_TYPES),
  title: z.string().trim().max(100).optional().or(z.literal("")),
  placement: z.enum(["homepage", "dashboard"]).default("homepage"),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const url = new URL(req.url);
    const placement = url.searchParams.get("placement");

    const widgets = await db.widget.findMany({
      where: placement ? { placement } : {},
      orderBy: [{ placement: "asc" }, { order: "asc" }],
    });

    return apiOk({ widgets });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const body = schema.parse(await req.json());
    const maxOrder = await db.widget.aggregate({ where: { placement: body.placement }, _max: { order: true } });

    const widget = await db.widget.create({
      data: {
        type: body.type,
        title: body.title || WIDGET_TYPE_INFO[body.type].label,
        placement: body.placement,
        config: (body.config ?? WIDGET_TYPE_INFO[body.type].defaultConfig) as object,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    await writeAuditLog({ adminId: admin.id, action: "WIDGET_CREATED", targetType: "Widget", targetId: widget.id, newState: body });

    return apiOk({ widget }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
