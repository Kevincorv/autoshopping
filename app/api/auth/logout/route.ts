import { NextResponse } from "next/server";
import { AUTH_CONFIG } from "@/lib/auth/config";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_CONFIG.cookieName);
  return response;
}
