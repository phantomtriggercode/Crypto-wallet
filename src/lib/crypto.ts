import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const ALGO = "aes-256-gcm";

function encryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY env var must be set to a 32+ byte hex string");
  }
  return Buffer.from(key, "hex").subarray(0, 32);
}

/** Encrypts a secret (2FA secrets, SMTP passwords) for storage. Never log the plaintext. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** One-way hash for verification/reset tokens and backup codes — never store these in plaintext. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function generateNumericOtp(digits = 6): string {
  const max = 10 ** digits;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(digits, "0");
}

/** Generates a simulated 12-word recovery phrase for the educational wallet-creation flow. */
const WORDLIST = [
  "amber","anchor","apple","arena","ashore","autumn","banjo","basil","beacon","bison",
  "canyon","cedar","cinder","clover","comet","coral","cosmic","crimson","crystal","dawn",
  "delta","desert","dune","eagle","echo","ember","falcon","fern","flint","forest",
  "galaxy","garnet","glacier","granite","harbor","hazel","horizon","indigo","ivory","jasper",
  "juniper","kestrel","lagoon","lantern","lumen","maple","marble","meadow","meteor","mirage",
  "nebula","nectar","nomad","oasis","obsidian","onyx","opal","orbit","orchid","otter",
  "pebble","phoenix","pine","prairie","prism","quartz","quill","raven","reef","ridge",
  "river","rustic","saffron","sage","sequoia","shadow","silver","solstice","sonic","spruce",
  "storm","summit","sunset","tempest","thistle","thunder","timber","topaz","tundra","umber",
  "valley","velvet","vertex","violet","vista","willow","wren","zenith","zephyr","zodiac",
];

export function generateRecoveryPhrase(words = 12): string[] {
  const phrase: string[] = [];
  for (let i = 0; i < words; i++) {
    phrase.push(WORDLIST[crypto.randomInt(0, WORDLIST.length)]);
  }
  return phrase;
}

export async function hashRecoveryPhrase(phrase: string[]): Promise<string> {
  const normalized = phrase.map((w) => w.trim().toLowerCase()).join(" ");
  return bcrypt.hash(normalized, 12);
}

export async function verifyRecoveryPhrase(phrase: string[], hash: string): Promise<boolean> {
  const normalized = phrase.map((w) => w.trim().toLowerCase()).join(" ");
  return bcrypt.compare(normalized, hash);
}
