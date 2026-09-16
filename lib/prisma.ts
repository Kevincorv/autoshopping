import { PrismaClient } from "../prisma/client/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import mariadb from "mariadb";

const rawUrl =
  process.env.DATABASE_URL ||
  "mysql://3WsTbVXhshksEUi.root:U4uJqhQsDOJv6dnZ@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/autoshopping";

function createPool() {
  try {
    const url = new URL(rawUrl);
    const params: Record<string, string> = {};
    url.searchParams.forEach((v, k) => { params[k] = v; });

    return mariadb.createPool({
      host: url.hostname,
      port: parseInt(url.port || "4000", 10),
      user: url.username,
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      ssl: {
        rejectUnauthorized: false,
      },
      connectTimeout: 60000,
      acquireTimeout: 60000,
      connectionLimit: 5,
    });
  } catch {
    return mariadb.createPool(rawUrl);
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient;
  mariadbPool: ReturnType<typeof mariadb.createPool>;
};

const pool = globalForPrisma.mariadbPool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForPrisma.mariadbPool = pool;

const adapter = new PrismaMariaDb(pool as any);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
