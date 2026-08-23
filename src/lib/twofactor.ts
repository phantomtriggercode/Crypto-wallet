import "server-only";
import { authenticator } from "otplib";
import QRCode from "qrcode";

export function generateTotpSecret() {
  return authenticator.generateSecret();
}

export function verifyTotp(token: string, secret: string) {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
}

export async function totpQrCodeDataUrl(email: string, secret: string, issuer: string) {
  const otpauth = authenticator.keyuri(email, issuer, secret);
  return QRCode.toDataURL(otpauth);
}
