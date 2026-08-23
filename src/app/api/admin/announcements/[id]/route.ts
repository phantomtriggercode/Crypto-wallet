import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

const schema = z.object({ active: z.boolean() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);
    const { id } = await params;
    const { active } = schema.parse(await req.json());
    const announcement = await db.announcement.update({ where: { id }, data: { active } });
    return apiOk({ announcement });
  } catch (err) {
    return handleApiError(err);
  }
}
