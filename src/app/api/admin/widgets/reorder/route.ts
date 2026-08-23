import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

const schema = z.object({ ids: z.array(z.string().min(1)).min(1) });

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { ids } = schema.parse(await req.json());
    await db.$transaction(ids.map((id, index) => db.widget.update({ where: { id }, data: { order: index } })));

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
