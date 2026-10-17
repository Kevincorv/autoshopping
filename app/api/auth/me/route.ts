import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth/jwt";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { validateSession } from "@/lib/auth/session-store";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(AUTH_CONFIG.cookieName)?.value;
    if (!token) return NextResponse.json({ user: null });

    const payload = await verifySessionToken(token);
    if (!payload) return NextResponse.json({ user: null });

    if (payload.sid) {
      const validation = await validateSession(payload.sid);
      if (!validation.ok) {
        return NextResponse.json({
          user: null,
          sessionState: validation.reason,
        });
      }
    } else {
      return NextResponse.json({ user: null, sessionState: "missing" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        phone: true,
        document: true,
        city: true,
        department: true,
        address: true,
        mustChangePassword: true,
        twoFactorEnabled: true,
        isActive: true,
        role: { select: { name: true } },
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
