import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, type JwtPayload } from "./jwt";
import { AUTH_CONFIG } from "./config";
import { can, type Permission } from "./permissions";
import { validateSession } from "./session-store";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export interface AuthContext extends JwtPayload {
  sid?: string;
  mustChangePassword: boolean;
  twoFactorEnabled: boolean;
}

const ALWAYS_ALLOWED_PATHS = [
  "/api/auth/change-password",
  "/api/auth/me",
  "/api/auth/logout",
];

const SESSIONLESS_2FA_PATHS = ["/api/auth/2fa/pending-status"];

export function getClientIp(request: Request): string | undefined {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = request.headers.get("x-real-ip");
  return real || undefined;
}

function errorResponse(status: number, error: string, code?: string) {
  return NextResponse.json({ error, ...(code ? { code } : {}) }, { status });
}

export async function getSession(request: NextRequest): Promise<JwtPayload | null> {
  const token = request.cookies.get(AUTH_CONFIG.cookieName)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

function pathAllowed(pathname: string, list: string[]): boolean {
  return list.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function requireAuth(
  request: NextRequest
): Promise<{ payload: AuthContext; response: null } | { payload: null; response: NextResponse }> {
  const pathname = new URL(request.url).pathname;

  const token = request.cookies.get(AUTH_CONFIG.cookieName)?.value;
  if (!token) {
    return { payload: null, response: errorResponse(401, "No autorizado", "UNAUTHENTICATED") };
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    return { payload: null, response: errorResponse(401, "Sesión inválida o expirada", "INVALID_TOKEN") };
  }

  if (payload.sid) {
    const validation = await validateSession(payload.sid);
    if (!validation.ok) {
      const code =
        validation.reason === "idle" ? "SESSION_IDLE" : "SESSION_EXPIRED";
      const msg =
        validation.reason === "idle"
          ? "Sesión cerrada por inactividad"
          : "Sesión expirada o revocada";
      return { payload: null, response: errorResponse(401, msg, code) };
    }
  } else {
    return { payload: null, response: errorResponse(401, "Sesión inválida", "SESSION_MISSING") };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { role: { select: { name: true } } },
  });

  if (!user) {
    return { payload: null, response: errorResponse(401, "Usuario inexistente", "UNAUTHENTICATED") };
  }
  if (!user.isActive) {
    return { payload: null, response: errorResponse(403, "Cuenta desactivada", "ACCOUNT_DISABLED") };
  }

  const mustChangePassword = user.mustChangePassword;
  const twoFactorEnabled = user.twoFactorEnabled;

  if (user.role.name === "admin" && !twoFactorEnabled && !pathAllowed(pathname, ALWAYS_ALLOWED_PATHS)) {
    const under2fa = pathname.startsWith("/api/auth/2fa/") || pathAllowed(pathname, SESSIONLESS_2FA_PATHS);
    if (!under2fa) {
      return {
        payload: null,
        response: errorResponse(403, "El administrador debe activar la verificación en dos pasos", "TWO_FACTOR_SETUP_REQUIRED"),
      };
    }
  }

  const context: AuthContext = {
    ...payload,
    roleName: user.role.name,
    roleId: user.roleId,
    mustChangePassword,
    twoFactorEnabled,
  };

  return { payload: context, response: null };
}

export async function requireRole(
  request: NextRequest,
  ...roles: string[]
): Promise<{ payload: AuthContext; response: null } | { payload: null; response: NextResponse }> {
  const result = await requireAuth(request);
  if (result.response) return result;
  if (!roles.includes(result.payload.roleName)) {
    await audit({
      action: "access.denied",
      resource: new URL(request.url).pathname,
      details: `Rol "${result.payload.roleName}" sin permiso (requerido: ${roles.join(", ")})`,
      request,
    });
    return { payload: null, response: errorResponse(403, "Acceso denegado", "FORBIDDEN") };
  }
  return result;
}

export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<{ payload: AuthContext; response: null } | { payload: null; response: NextResponse }> {
  const result = await requireAuth(request);
  if (result.response) return result;
  if (!can(result.payload.roleName, permission)) {
    await audit({
      action: "access.denied",
      resource: new URL(request.url).pathname,
      details: `Rol "${result.payload.roleName}" sin permiso "${permission}"`,
      request,
    });
    return { payload: null, response: errorResponse(403, "Acceso denegado", "FORBIDDEN") };
  }
  return result;
}

export async function requireAdmin(
  request: NextRequest
): Promise<{ payload: AuthContext; response: null } | { payload: null; response: NextResponse }> {
  return requireRole(request, "admin");
}

export function unauthorized() {
  return errorResponse(401, "No autorizado", "UNAUTHENTICATED");
}

export function forbidden() {
  return errorResponse(403, "Acceso denegado", "FORBIDDEN");
}

export async function getSessionUser(request?: NextRequest): Promise<AuthContext | null> {
  if (request) {
    const result = await requireAuth(request);
    return result.response ? null : result.payload;
  }
  const { cookies } = await import("next/headers");
  const token = cookies().get(AUTH_CONFIG.cookieName)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  return {
    ...payload,
    mustChangePassword: !!payload.mustChangePassword,
    twoFactorEnabled: !!payload.twoFactorEnabled,
  };
}
