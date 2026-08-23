import { requireUser } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);
    return apiOk({
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        isAdmin: user.isAdmin,
        adminRoles: user.adminRoles.map((r) => r.role),
        kycStatus: user.kycStatus,
        twoFactorEnabled: user.twoFactorEnabled,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
