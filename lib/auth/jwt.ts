import { SignJWT, jwtVerify } from "jose";
import { AUTH_CONFIG } from "./config";

const encoder = new TextEncoder();

export interface JwtPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  sid?: string;
  purpose?: "session" | "2fa";
  mustChangePassword?: boolean;
  twoFactorEnabled?: boolean;
}

function getSecret(): Uint8Array {
  return encoder.encode(AUTH_CONFIG.jwtSecret);
}

export async function signToken(
  payload: JwtPayload,
  opts?: { expiresIn?: string }
): Promise<string> {
  const body: Record<string, unknown> = { ...payload };
  if (!body.purpose) body.purpose = "session";
  return new SignJWT(body)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(AUTH_CONFIG.issuer)
    .setExpirationTime(opts?.expiresIn || AUTH_CONFIG.jwtExpiresIn)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: AUTH_CONFIG.issuer,
    });
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string): Promise<JwtPayload | null> {
  const payload = await verifyToken(token);
  if (!payload) return null;
  if (payload.purpose && payload.purpose !== "session") return null;
  return payload;
}
