import { cookies } from "next/headers";
import { AUTH_CONFIG } from "./config";

export function getSessionCookie(): string | undefined {
  const cookieStore = cookies();
  return cookieStore.get(AUTH_CONFIG.cookieName)?.value;
}

export function setSessionCookie(token: string): void {
  const cookieStore = cookies();
  cookieStore.set(AUTH_CONFIG.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
}

export function clearSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete(AUTH_CONFIG.cookieName);
}
