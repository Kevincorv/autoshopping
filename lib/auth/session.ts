import { cookies } from "next/headers";
import { verifyToken } from "./jwt";
import { AUTH_CONFIG } from "./config";

export interface SessionUser {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const token = cookies().get(AUTH_CONFIG.cookieName)?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export function getUserLabel(user: SessionUser | null): string {
  return user ? `${user.email} (${user.roleName})` : "sistema";
}