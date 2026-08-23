import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { hashRecoveryPhrase } from "@/lib/crypto";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { logSecurityEvent } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

const schema = z.object({ phrase: z.array(z.string().min(2)).length(12) });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { phrase } = schema.parse(await req.json());
    const recoveryPhraseHash = await hashRecoveryPhrase(phrase);

    // Only the hash is ever persisted — the plaintext phrase never touches the database,
    // and this hash is not exposed through any admin-facing API or dashboard.
    await db.user.update({
      where: { id: user.id },
      data: { recoveryPhraseHash, recoveryPhraseSetAt: new Date() },
    });

    await logSecurityEvent({ userId: user.id, type: "RECOVERY_PHRASE_SET" });
    await notifyUser({
      userId: user.id,
      type: "SECURITY",
      title: "Recovery phrase configured",
      message: "A wallet recovery phrase has been set for your account. Store it somewhere safe.",
    });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
