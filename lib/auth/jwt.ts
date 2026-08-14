import { SignJWT, jwtVerify } from "jose";
import { AUTH_CONFIG } from "./config";

const encoder = new TextEncoder();
const secret = encoder.encode(AUTH_CONFIG.jwtSecret);

export interface JwtPayload {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(AUTH_CONFIG.jwtExpiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}
