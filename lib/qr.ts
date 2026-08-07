import crypto from "crypto";
import QRCode from "qrcode";
import { SignJWT, jwtVerify } from "jose";

function secret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-before-production");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function makeToken(payload: Record<string, unknown>, expiresIn = "7d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function verifyToken<T>(token: string) {
  const { payload } = await jwtVerify(token, secret());
  return payload as T;
}

export async function qrDataUrl(url: string) {
  return QRCode.toDataURL(url, {
    margin: 1,
    width: 220,
    color: { dark: "#111827", light: "#ffffff" }
  });
}

export function otpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
