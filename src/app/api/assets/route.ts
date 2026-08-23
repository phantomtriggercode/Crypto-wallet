import { db } from "@/lib/db";
import { apiOk, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const assets = await db.asset.findMany({
      where: { enabled: true },
      orderBy: { displayOrder: "asc" },
      include: { networks: { where: { enabled: true } } },
    });
    return apiOk({ assets });
  } catch (err) {
    return handleApiError(err);
  }
}
