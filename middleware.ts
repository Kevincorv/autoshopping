import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";
import { AUTH_CONFIG } from "@/lib/auth/config";
import { isErpRole } from "@/lib/auth/permissions";
import { rateLimit } from "@/lib/auth/rate-limit";

const PUBLIC_API_ANY: RegExp[] = [
  /^\/api\/auth(\/|$)/,
  /^\/api\/search(\/|$)/,
  /^\/api\/cart(\/|$)/,
  /^\/api\/csp-report$/,
  /^\/api\/payment\/providers$/,
];

const PUBLIC_API_GET: RegExp[] = [
  /^\/api\/categories(\/|$)/,
  /^\/api\/brands(\/|$)/,
  /^\/api\/products(\/|$)/,
  /^\/api\/track(\/|$)/,
  /^\/api\/posts(\/|$)/,
  /^\/api\/push\/public-key$/,
  /^\/api\/v1\/products$/,
  /^\/api\/v1$/,
  /^\/api\/chat$/,
];

const PUBLIC_API_POST: RegExp[] = [
  /^\/api\/orders$/,
  /^\/api\/coupons\/validate$/,
  /^\/api\/push\/subscribe$/,
  /^\/api\/push\/unsubscribe$/,
];

function isPublicApi(pathname: string, method: string): boolean {
  if (PUBLIC_API_ANY.some((re) => re.test(pathname))) return true;
  if (method === "GET" && PUBLIC_API_GET.some((re) => re.test(pathname))) return true;
  if (method === "POST" && PUBLIC_API_POST.some((re) => re.test(pathname))) return true;
  return false;
}

function jsonError(status: number, error: string, code: string) {
  return NextResponse.json({ error, code }, { status });
}

function checkOrigin(request: NextRequest): NextResponse | null {
  const method = request.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return null;

  const origin = request.headers.get("origin");
  if (!origin) return null;

  const host = request.headers.get("host");
  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    return jsonError(403, "Origen inválido", "CSRF_INVALID_ORIGIN");
  }

  const trusted = AUTH_CONFIG.trustedOrigins;
  const sameHost = originHost === host;
  if (!sameHost && !trusted.includes(origin)) {
    return jsonError(403, "Origen no permitido para esta operación", "CSRF_FORBIDDEN_ORIGIN");
  }
  return null;
}

function redirectLogin(request: NextRequest, pathname: string): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", pathname);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  const isApi = pathname.startsWith("/api");

  const originError = isApi ? checkOrigin(request) : null;
  if (originError) return originError;

  if (isApi) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "local";
    const limiter = rateLimit(`api:${ip}`, 600, 60_000);
    if (!limiter.ok) {
      return jsonError(429, "Demasiadas solicitudes. Esperá un momento.", "RATE_LIMITED");
    }

    if (isPublicApi(pathname, method)) {
      return NextResponse.next();
    }

    const token = request.cookies.get(AUTH_CONFIG.cookieName)?.value;
    const payload = token ? await verifyToken(token) : null;
    if (!payload || (payload.purpose && payload.purpose !== "session")) {
      return jsonError(401, "No autorizado", "UNAUTHENTICATED");
    }
    return NextResponse.next();
  }

  if (pathname === "/login/2fa") {
    const pending = request.cookies.get(AUTH_CONFIG.pending2faCookieName)?.value;
    const pendingPayload = pending ? await verifyToken(pending) : null;
    if (!pendingPayload || pendingPayload.purpose !== "2fa") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  const authPages = ["/dashboard", "/wishlist", "/change-password", "/2fa-setup"];
  const needsAuthPage = authPages.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!needsAuthPage) return NextResponse.next();

  const token = request.cookies.get(AUTH_CONFIG.cookieName)?.value;
  const payload = token ? await verifyToken(token) : null;

  if (!payload) {
    return redirectLogin(request, pathname);
  }

  if (payload.purpose && payload.purpose !== "session") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (payload.roleName === "admin" && !payload.twoFactorEnabled) {
    if (pathname !== "/2fa-setup") {
      return NextResponse.redirect(new URL("/2fa-setup", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/")) {
    if (!isErpRole(payload.roleName)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?|ttf)$).*)"],
};
