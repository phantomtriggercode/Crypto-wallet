import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiError(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function apiOk<T extends object>(data: T, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return apiError("Invalid input", 422, { issues: err.flatten() });
  }
  if (err instanceof Error) {
    if (err.name === "InsufficientBalanceError") return apiError(err.message, 400);
    console.error(err);
    return apiError("Something went wrong. Please try again.", 500);
  }
  console.error(err);
  return apiError("Something went wrong. Please try again.", 500);
}
