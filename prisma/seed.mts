import "dotenv/config";
import { PrismaClient } from "./client/client.js";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL || "file:./prisma/dev.db";
const prisma = new PrismaClient({ adapter: new PrismaLibSql({ url }) });

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
  console.log("Using database URL:", url);
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

  const vehicles = [
    { make: "Toyota", model: "Hilux", yearStart: 2015, yearEnd: 2019, engine: "2.8L Diesel", fuel: "Diésel", displacement: "2755cc", generation: "VIII (AN120/AN130)" },
    { make: "Toyota", model: "Corolla", yearStart: 2015, yearEnd: 2019, engine: "1.8L", fuel: "Nafta", displacement: "1794cc", generation: "XI (E170)" },
    { make: "Toyota", model: "Corolla", yearStart: 2020, yearEnd: 2026, engine: "2.0L", fuel: "Nafta", displacement: "1987cc", generation: "XII (E210)" },
    { make: "Chevrolet", model: "Onix", yearStart: 2019, yearEnd: 2026, engine: "1.2L Turbo", fuel: "Nafta", displacement: "1199cc", generation: "II (RS)" },
    { make: "Hyundai", model: "Tucson", yearStart: 2016, yearEnd: 2020, engine: "2.0L", fuel: "Nafta", displacement: "1999cc", generation: "III (TL)" },
    { make: "Kia", model: "Sportage", yearStart: 2016, yearEnd: 2021, engine: "2.0L", fuel: "Nafta", displacement: "1999cc", generation: "IV (QL)" },
    { make: "Volkswagen", model: "Amarok", yearStart: 2017, yearEnd: 2023, engine: "3.0L V6", fuel: "Diésel", displacement: "2967cc", generation: "I (facelift)" },
    { make: "Nissan", model: "Frontier", yearStart: 2016, yearEnd: 2021, engine: "2.3L", fuel: "Diésel", displacement: "2298cc", generation: "D23" },
  ];

  for (const v of vehicles) {
    const exist = await prisma.vehicle.findFirst({ where: { make: v.make, model: v.model, engine: v.engine } });
    if (!exist) await prisma.vehicle.create({ data: v });
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
