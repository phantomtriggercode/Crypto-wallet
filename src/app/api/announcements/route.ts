import { db } from "@/lib/db";
import { apiOk, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const announcements = await db.announcement.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, take: 5 });
    return apiOk({ announcements });
  } catch (err) {
    return handleApiError(err);
  }
}
