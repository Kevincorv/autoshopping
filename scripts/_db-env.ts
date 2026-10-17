import "dotenv/config";

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta DATABASE_URL. Definila en el archivo .env antes de correr este script.");
  }
  return url;
}

export function poolConfigFromEnv() {
  const url = new URL(requireDatabaseUrl());
  return {
    host: url.hostname,
    port: parseInt(url.port || "4000", 10),
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl: { rejectUnauthorized: false },
    connectTimeout: 60000,
  };
}
