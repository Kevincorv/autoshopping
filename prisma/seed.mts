import "dotenv/config";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

const ROLES = [
  { name: "admin", description: "Acceso total al sistema" },
  { name: "sales", description: "Encargado de ventas y pedidos" },
  { name: "stock_manager", description: "Encargado de inventario" },
  { name: "accountant", description: "Encargado de finanzas y caja" },
  { name: "customer", description: "Cliente registrado" },
];

const PERMISSIONS: Record<string, { resources: string[]; actions: string[] }> = {
  admin: {
    resources: ["products", "categories", "orders", "users", "settings", "reports", "roles", "brands", "customers", "suppliers", "purchases", "stock", "returns", "cash", "notifications", "integrations", "sales"],
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

function generateStrongPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*-_";
  const bytes = crypto.randomBytes(24);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

async function main() {
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

  const existingAdmin = await prisma.user.findUnique({ where: { email: "admin@autoshopping.com" } });
  const envPassword = process.env.ADMIN_INITIAL_PASSWORD?.trim() || null;
  let generatedPassword: string | null = null;

  if (!existingAdmin) {
    const plain = envPassword || generateStrongPassword();
    if (!envPassword) generatedPassword = plain;
    await prisma.user.create({
      data: {
        name: "Admin",
        lastname: "Sistema",
        document: "0000000",
        phone: "000000000",
        email: "admin@autoshopping.com",
        passwordHash: await bcrypt.hash(plain, 12),
        roleId: adminRole.id,
        mustChangePassword: true,
      },
    });
    console.log("Admin creado: admin@autoshopping.com");
  }

  const forced = await prisma.user.updateMany({
    where: { passwordChangedAt: null, mustChangePassword: false },
    data: { mustChangePassword: true },
  });
  if (forced.count > 0) {
    console.log(`${forced.count} usuario(s) marcados para cambio obligatorio de contraseña.`);
  }

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

  const pending = await prisma.user.findMany({
    where: { mustChangePassword: true },
    select: { email: true, role: { select: { name: true } } },
  });

  console.log("Seed completado.");
  if (generatedPassword) {
    console.log("=====================================================");
    console.log("  CREDENCIAL INICIAL DEL ADMIN (guardala ahora):");
    console.log("  email:    admin@autoshopping.com");
    console.log(`  password: ${generatedPassword}`);
    console.log("  Se pedirá cambiarla en el primer ingreso.");
    console.log("=====================================================");
  } else {
    console.log("Admin existente intacto (no se regeneró la contraseña).");
  }
  if (pending.length) {
    console.log(`Usuarios con cambio de contraseña obligatorio (${pending.length}):`);
    for (const u of pending) console.log(`  - ${u.email} (${u.role.name})`);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
