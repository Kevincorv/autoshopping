import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, type JwtPayload } from "./jwt";
import { AUTH_CONFIG } from "./config";

export async function getSession(request: NextRequest): Promise<JwtPayload | null> {
  const token = request.cookies.get(AUTH_CONFIG.cookieName)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAuth(
  request: NextRequest
): Promise<{ payload: JwtPayload; response: null } | { payload: null; response: NextResponse }> {
  const payload = await getSession(request);
  if (!payload) {
    return {
      payload: null,
      response: NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      ),
    };
  }
  return { payload, response: null };
}
