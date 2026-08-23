import "server-only";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { AppError } from "@/lib/api";

// Private, non-web-served storage root. Never place KYC documents under /public.
const STORAGE_ROOT = process.env.PRIVATE_STORAGE_PATH || path.join(process.cwd(), "storage");

function safeExt(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
}

/** Saves a file under a private folder and returns an opaque storage key (never a public URL). */
export async function savePrivateFile(folder: string, filename: string, buffer: Buffer): Promise<string> {
  const dir = path.join(STORAGE_ROOT, folder);
  await mkdir(dir, { recursive: true });
  const key = `${crypto.randomUUID()}${safeExt(filename)}`;
  await writeFile(path.join(dir, key), buffer);
  return `${folder}/${key}`;
}

export async function readPrivateFile(storageKey: string): Promise<Buffer> {
  const resolved = path.normalize(path.join(STORAGE_ROOT, storageKey));
  if (!resolved.startsWith(path.normalize(STORAGE_ROOT))) {
    throw new Error("Invalid storage key");
  }
  return readFile(resolved);
}

export async function deletePrivateFile(storageKey: string): Promise<void> {
  const resolved = path.normalize(path.join(STORAGE_ROOT, storageKey));
  if (!resolved.startsWith(path.normalize(STORAGE_ROOT))) return;
  await unlink(resolved).catch(() => undefined);
}

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function validateUpload(file: File) {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new AppError("Unsupported file type. Please upload a PNG, JPG, WEBP, or PDF.", 422);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new AppError("File is too large. Maximum size is 10MB.", 422);
  }
}
