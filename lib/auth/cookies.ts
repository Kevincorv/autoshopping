import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
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
    maxAge: AUTH_CONFIG.sessionDays * 24 * 60 * 60,
    path: "/",
  });
}

export function clearSessionCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete(AUTH_CONFIG.cookieName);
}

const baseCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function setSessionCookieOn(response: NextResponse, token: string, maxAgeSec?: number): void {
  response.cookies.set(AUTH_CONFIG.cookieName, token, {
    ...baseCookie,
    maxAge: maxAgeSec ?? AUTH_CONFIG.sessionDays * 24 * 60 * 60,
  });
}

export function clearSessionCookieOn(response: NextResponse): void {
  response.cookies.set(AUTH_CONFIG.cookieName, "", { ...baseCookie, maxAge: 0 });
}

export function setPending2faCookieOn(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_CONFIG.pending2faCookieName, token, {
    ...baseCookie,
    maxAge: 10 * 60,
  });
}

export function clearPending2faCookieOn(response: NextResponse): void {
  response.cookies.set(AUTH_CONFIG.pending2faCookieName, "", { ...baseCookie, maxAge: 0 });
}
