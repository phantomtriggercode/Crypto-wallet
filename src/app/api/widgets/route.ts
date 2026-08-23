import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getWidgetData } from "@/lib/widgets";
import { apiOk, handleApiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const placement = url.searchParams.get("placement") === "dashboard" ? "dashboard" : "homepage";

    const [widgets, user] = await Promise.all([
      db.widget.findMany({ where: { placement, enabled: true }, orderBy: { order: "asc" } }),
      getCurrentUser(),
    ]);

    const rendered = await Promise.all(
      widgets.map(async (w) => ({
        id: w.id,
        type: w.type,
        title: w.title,
        config: w.config,
        data: await getWidgetData(w, { userId: user?.id }),
      }))
    );

    return apiOk({ widgets: rendered });
  } catch (err) {
    return handleApiError(err);
  }
}
