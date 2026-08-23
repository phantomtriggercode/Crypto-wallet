import { requireUser } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { generateRecoveryPhrase } from "@/lib/crypto";

export async function POST() {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const phrase = generateRecoveryPhrase(12);
    return apiOk({ phrase });
  } catch (err) {
    return handleApiError(err);
  }
}
