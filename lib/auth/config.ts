function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `[seguridad] Falta la variable de entorno "${name}". ` +
        `Definila en .env (desarrollo) o en los Environment Variables del proyecto (Vercel/producción). ` +
        `Nunca uses un valor por defecto para secretos.`
    );
  }
  return value.trim();
}

export const AUTH_CONFIG = {
  cookieName: "session",
  pending2faCookieName: "pending2fa",
  jwtExpiresIn: "7d",
  pending2faExpiresIn: "10m",
  sessionDays: 7,
  sessionIdleMinutes: Number(process.env.SESSION_IDLE_MINUTES || 60),
  bcryptRounds: 12,
  maxFailedLogins: 5,
  lockoutMinutes: 15,
  ipMaxFailures: 20,
  ipWindowMinutes: 15,
  issuer: "autoshopping",
  get jwtSecret(): string {
    return requiredEnv("JWT_SECRET");
  },
  get trustedOrigins(): string[] {
    const raw = process.env.TRUSTED_ORIGINS || "";
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
};

export function isTwoFactorRequired(roleName: string, twoFactorEnabled: boolean): boolean {
  return roleName === "admin" && !twoFactorEnabled;
}
