import "dotenv/config";
import { PrismaClient } from "../prisma/client/client.js";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const SUPPORTED_QUERY_KEYS = new Set(["tls", "authToken", "cache"]);
function sanitizeLibsqlUrl(rawUrl: string): string {
  if (!rawUrl || !rawUrl.includes("?")) return rawUrl;
  const qIdx = rawUrl.indexOf("?");
  const hashIdx = rawUrl.indexOf("#", qIdx);
  const queryEnd = hashIdx === -1 ? rawUrl.length : hashIdx;
  const queryStr = rawUrl.substring(qIdx + 1, queryEnd);
  const tail = hashIdx === -1 ? "" : rawUrl.substring(hashIdx);
  const kept: string[] = [];
  for (const pair of queryStr.split("&")) {
    if (!pair) continue;
    const key = pair.split("=")[0];
    if (SUPPORTED_QUERY_KEYS.has(key)) kept.push(pair);
  }
  return kept.length
    ? rawUrl.substring(0, qIdx + 1) + kept.join("&") + tail
    : rawUrl.substring(0, qIdx) + tail;
}

const url = sanitizeLibsqlUrl(process.env.DATABASE_URL || "file:./dev.db");
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

const roles = await prisma.role.findMany({
  include: { _count: { select: { users: true, permissions: true } } },
});

console.log("\n=== ROLES ===");
for (const r of roles) {
  console.log(`  ${r.name}: ${r._count.users} users, ${r._count.permissions} permissions`);
}

const users = await prisma.user.findMany({
  select: { email: true, name: true, lastname: true, role: { select: { name: true } } },
});

console.log("\n=== USERS ===");
for (const u of users) {
  console.log(`  ${u.email} (${u.name} ${u.lastname}) - Role: ${u.role.name}`);
}

const settingsCount = await prisma.setting.count();
console.log(`\n=== SETTINGS: ${settingsCount} ===`);

const perms = await prisma.permission.findMany({
  include: { role: { select: { name: true } } },
  orderBy: [{ roleId: "asc" }, { resource: "asc" }],
});

console.log("\n=== PERMISSIONS ===");
for (const p of perms) {
  console.log(`  ${p.role.name}: ${p.action} ${p.resource}`);
}

await prisma.$disconnect();
