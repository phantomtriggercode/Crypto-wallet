import { deleteSession } from "@/lib/session";
import { apiOk, handleApiError } from "@/lib/api";

export async function POST() {
  try {
    await deleteSession();
    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
