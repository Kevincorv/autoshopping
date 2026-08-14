import "dotenv/config";
import { PrismaClient } from "../prisma/client/client.js";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
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
