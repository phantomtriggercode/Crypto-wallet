import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { generateTotpSecret, totpQrCodeDataUrl } from "@/lib/twofactor";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { getSettings } from "@/lib/settings";

export async function POST() {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);
    if (user.twoFactorEnabled) return apiError("Two-factor authentication is already enabled.", 400);

    const secret = generateTotpSecret();
    const settings = await getSettings();
    const qrCodeDataUrl = await totpQrCodeDataUrl(user.email, secret, settings.siteName);

    await db.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: encryptSecret(secret), twoFactorMethod: "TOTP" },
    });

    return apiOk({ secret, qrCodeDataUrl });
  } catch (err) {
    return handleApiError(err);
  }
}
