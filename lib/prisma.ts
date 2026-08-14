import { PrismaClient } from "../prisma/client/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const url = process.env.DATABASE_URL || "mysql://root:root@localhost:3306/autoshopping";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter: new PrismaMariaDb(url) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;