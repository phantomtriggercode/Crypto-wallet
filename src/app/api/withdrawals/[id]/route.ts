import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { id } = await params;
    const withdrawal = await db.withdrawal.findUnique({
      where: { id },
      include: { asset: true, network: true },
    });

    if (!withdrawal || (withdrawal.userId !== user.id && !user.isAdmin)) {
      return apiError("Withdrawal not found.", 404);
    }

    return apiOk({ withdrawal });
  } catch (err) {
    return handleApiError(err);
  }
}
