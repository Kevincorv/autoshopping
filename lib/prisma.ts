import { PrismaClient } from "../prisma/client/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const raw = process.env.DATABASE_URL || "mysql://root:root@localhost:3306/autoshopping";
const url = new URL(raw);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ""),
  connectionLimit: 5,
  ssl: { rejectUnauthorized: false },
});

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;