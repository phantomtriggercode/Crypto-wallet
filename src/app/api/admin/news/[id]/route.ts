import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

const schema = z.object({
  headline: z.string().trim().min(3).max(200).optional(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
  publisher: z.string().trim().max(100).nullable().optional(),
  summary: z.string().trim().max(1000).nullable().optional(),
  featured: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const changes = schema.parse(await req.json());
    const article = await db.newsArticle.update({ where: { id }, data: changes });
    return apiOk({ article });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    await db.newsArticle.delete({ where: { id } });
    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
