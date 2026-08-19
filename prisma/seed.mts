import "dotenv/config";
import { PrismaClient } from "./client/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const raw = process.env.DATABASE_URL || "mysql://root:root@localhost:3306/autoshopping";
const url = new URL(raw);
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl: { rejectUnauthorized: false },
  }),
});

const ROLES = [
  { name: "admin", description: "Acceso total al sistema" },
  { name: "sales", description: "Encargado de ventas y pedidos" },
  { name: "stock_manager", description: "Encargado de inventario" },
  { name: "accountant", description: "Encargado de finanzas y caja" },
  { name: "customer", description: "Cliente registrado" },
];

const PERMISSIONS: Record<string, { resources: string[]; actions: string[] }> = {
  admin: {
    resources: ["products", "categories", "orders", "users", "settings", "reports", "roles", "brands", "customers", "suppliers", "purchases", "stock", "vehicles", "returns", "cash", "notifications", "integrations", "sales"],
    actions: ["create", "read", "update", "delete"],
  },
  sales: {
    resources: ["orders", "customers", "sales", "returns"],
    actions: ["create", "read", "update"],
  },
  stock_manager: {
    resources: ["products", "stock", "purchases", "suppliers"],
    actions: ["read", "update"],
  },
  accountant: {
    resources: ["cash", "reports", "customers"],
    actions: ["read", "update"],
  },
  customer: {
    resources: [],
    actions: [],
  },
};

async function main() {
  console.log("Seeding database...");
  const adminPassword = await bcrypt.hash("admin123", 12);

  for (const roleData of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: { name: roleData.name, description: roleData.description },
    });

    const permConfig = PERMISSIONS[roleData.name];
    if (permConfig) {
      for (const resource of permConfig.resources) {
        for (const action of permConfig.actions) {
          try {
            await prisma.permission.upsert({
              where: { roleId_resource_action: { roleId: role.id, resource, action } },
              update: {},
              create: { roleId: role.id, resource, action },
            });
          } catch {
            console.log(`Permission already exists: ${role.name} ${resource} ${action}`);
          }
        }
      }
    }
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: "admin" } });

  await prisma.user.upsert({
    where: { email: "admin@autoshopping.com" },
    update: {},
    create: {
      name: "Admin",
      lastname: "Sistema",
      document: "0000000",
      phone: "000000000",
      email: "admin@autoshopping.com",
      passwordHash: adminPassword,
      roleId: adminRole.id,
    },
  });

  const settings = [
    { key: "company_name", value: "AutoShopping Paraguay" },
    { key: "company_phone", value: "+595 981 123456" },
    { key: "company_email", value: "info@autoshopping.com" },
    { key: "company_address", value: "Asunción, Paraguay" },
    { key: "whatsapp_number", value: "595981123456" },
    { key: "whatsapp_message", value: "Hola, quiero consultar sobre un producto" },
    { key: "shipping_free_min", value: "2000000" },
    { key: "currency", value: "PYG" },
    { key: "currency_symbol", value: "Gs." },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: { key: setting.key, value: setting.value },
    });
  }

  const suppliers = [
    { code: "PROV-001", name: "Importadora del Este S.A.", ruc: "80012345-6", email: "ventas@impdeleste.com.py", phone: "+595 61 500 1234", whatsapp: "595615001234", address: "Ruta 7, Km 10, CDE", city: "Ciudad del Este", paymentTerms: "30 días", contacts: JSON.stringify([{ name: "Ricardo Vera", role: "Ventas", phone: "+595 61 500 1234" }, { name: "Lidia Rojas", role: "Admin", phone: "+595 61 500 5678" }]) },
    { code: "PROV-002", name: "Autopartes Asunción", ruc: "80098765-4", email: "pedidos@autopartesasuncion.com.py", phone: "+595 21 555 6677", whatsapp: "595215556677", address: "Av. Mariscal López 4550", city: "Asunción", paymentTerms: "Contado", contacts: JSON.stringify([{ name: "Marcos Benítez", role: "Comercial", phone: "+595 21 555 6677" }]) },
    { code: "PROV-003", name: "Repuestos Central S.R.L.", ruc: "80123456-7", email: "compras@repuestoscentral.com.py", phone: "+595 981 222 333", whatsapp: "595981222333", address: "Acceso Sur Km 12", city: "San Lorenzo", paymentTerms: "Contado", contacts: null },
  ];

  for (const s of suppliers) {
    await prisma.supplier.upsert({
      where: { code: s.code },
      update: {},
      create: s,
    });
  }

  console.log("Seed completed successfully");
  console.log("Admin credentials: admin@autoshopping.com / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
