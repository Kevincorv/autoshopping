import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/jwt";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { revokeSession } from "@/lib/auth/session-store";
import { clearSessionCookieOn, clearPending2faCookieOn } from "@/lib/auth/cookies";
import { audit } from "@/lib/audit";

export async function POST(request: Request) {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_CONFIG.cookieName)?.value;
  const payload = token ? await verifySessionToken(token) : null;

  if (payload?.sid) {
    await revokeSession(payload.sid);
  }
  if (payload) {
    await audit({
      action: "auth.logout",
      resource: "auth",
      resourceId: payload.userId,
      details: `${payload.email} cerró sesión`,
      request,
      userId: payload.userId,
    });
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookieOn(response);
  clearPending2faCookieOn(response);
  return response;
}
