import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

const schema = z.object({
  headline: z.string().trim().min(3).max(200),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  publisher: z.string().trim().max(100).optional().or(z.literal("")),
  sourceUrl: z.string().trim().max(500).optional().or(z.literal("")),
  summary: z.string().trim().max(1000).optional().or(z.literal("")),
  category: z.string().trim().max(50).optional().or(z.literal("")),
  featured: z.boolean().default(false),
});

export async function GET() {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);
    const articles = await db.newsArticle.findMany({ orderBy: { publishedAt: "desc" } });
    return apiOk({ articles });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const body = schema.parse(await req.json());
    const article = await db.newsArticle.create({
      data: { ...body, imageUrl: body.imageUrl || null, publisher: body.publisher || null, sourceUrl: body.sourceUrl || null, summary: body.summary || null, category: body.category || null },
    });

    return apiOk({ article }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
