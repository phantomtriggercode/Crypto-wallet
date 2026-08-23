import { customAlphabet } from "nanoid";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const nano = customAlphabet(alphabet, 10);

export function generateRef(prefix: string) {
  return `${prefix}-${nano()}`;
}
