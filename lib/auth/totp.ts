import { generateSecret, generate, verify, generateURI } from "otplib";
import QRCode from "qrcode";
import crypto from "crypto";

const ISSUER = "AutoShopping";

export async function createTotpSecret(): Promise<string> {
  const secret = await Promise.resolve(generateSecret());
  return String(secret);
}

export function otpauthUri(secret: string, accountName: string): string {
  return generateURI({ issuer: ISSUER, label: accountName, secret });
}

export async function qrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { margin: 1, width: 240, color: { dark: "#111827", light: "#ffffff" } });
}

function normalizeToken(token: string): string {
  return String(token || "").replace(/[\s-]/g, "");
}

export async function verifyTotp(secret: string, token: string): Promise<boolean> {
  const clean = normalizeToken(token);
  if (!/^\d{6}$/.test(clean)) return false;
  try {
    const result = await verify({ secret, token: clean });
    return !!(result && (result as { valid?: boolean }).valid);
  } catch {
    return false;
  }
}

export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

function hashRecoveryCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function hashRecoveryCodes(codes: string[]): string {
  return JSON.stringify(codes.map(hashRecoveryCode));
}

export function parseRecoveryCodes(stored: string | null | undefined): string[] {
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export async function consumeRecoveryCode(
  stored: string | null,
  input: string
): Promise<{ ok: boolean; updated: string | null }> {
  const codes = parseRecoveryCodes(stored);
  const hashed = hashRecoveryCode(input);
  const idx = codes.indexOf(hashed);
  if (idx === -1) return { ok: false, updated: null };
  codes.splice(idx, 1);
  return { ok: true, updated: JSON.stringify(codes) };
}

export function countRecoveryCodes(stored: string | null | undefined): number {
  return parseRecoveryCodes(stored).length;
}
