import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import mariadb from "mariadb";

const RAW_URL = process.env.DATABASE_URL || "";

function parseUrl(raw: string) {
  const clean = raw.replace(/^\s*"|"?\s*$/g, "");
  const u = new URL(clean);
  return {
    host: u.hostname,
    port: parseInt(u.port || "4000", 10),
    user: u.username,
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "").split("?")[0],
  };
}

async function main() {
  const file = process.argv[2];
  const confirmed = process.argv.includes("--yes");

  if (!file) {
    console.error("Uso: npx tsx scripts/restore.mts <ruta/archivo.sql> --yes");
    process.exit(1);
  }
  if (!confirmed) {
    console.error("SEGURIDAD: añade --yes para confirmar. ESTO SOBRESCRIBE la base de datos actual.");
    process.exit(1);
  }
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    console.error(`No existe: ${abs}`);
    process.exit(1);
  }
  if (!RAW_URL) {
    console.error("DATABASE_URL no definido en .env");
    process.exit(1);
  }

  const sql = fs.readFileSync(abs, "utf8");
  const cfg = parseUrl(RAW_URL);

  console.log(`Restaurando ${abs} en ${cfg.database}@${cfg.host} ...`);
  const conn = await mariadb.createConnection({
    ...cfg,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 60000,
    multipleStatements: true,
  });

  try {
    await conn.query("SET FOREIGN_KEY_CHECKS=0");
    await conn.query(sql);
    await conn.query("SET FOREIGN_KEY_CHECKS=1");
    const rows = await conn.query("SHOW TABLES");
    console.log(`Restauración OK. ${rows.length} tablas presentes.`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("Restauración falló:", e.message || e);
  process.exit(1);
});
