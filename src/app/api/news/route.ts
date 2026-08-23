import { db } from "@/lib/db";
import { apiOk, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const articles = await db.newsArticle.findMany({ orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 30 });
    return apiOk({ articles });
  } catch (err) {
    return handleApiError(err);
  }
}
