import { isErpRole } from "@/lib/auth/permissions";

export function defaultRedirect(roleName?: string): string {
  if (roleName && isErpRole(roleName)) return "/dashboard/admin";
  return "/dashboard";
}

export function sanitizeRedirect(raw: string | null | undefined, roleName?: string): string {
  if (raw) {
    const value = raw.trim();
    const isLocalPath =
      value.startsWith("/") && !value.startsWith("//") && !value.includes("\\") && !/[\r\n]/.test(value);
    const isAuthLoop = value.startsWith("/login") || value.startsWith("/register");
    if (isLocalPath && !isAuthLoop) return value;
  }
  return defaultRedirect(roleName);
}
