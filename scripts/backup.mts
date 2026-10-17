import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import mariadb from "mariadb";

const RAW_URL = process.env.DATABASE_URL || "";
const RETENTION = parseInt(process.env.BACKUP_RETENTION || "30", 10);
const OUT_DIR = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(import.meta.dirname, "..", "backups");

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

function sqlValue(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `'${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}'`;
  }
  if (Buffer.isBuffer(v)) return `0x${v.toString("hex")}`;
  const s = String(v).replace(/\\/g, "\\\\").replace(/'/g, "''").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  return `'${s}'`;
}

async function main() {
  if (!RAW_URL) {
    console.error("DATABASE_URL no definido en .env");
    process.exit(1);
  }

  const cfg = parseUrl(RAW_URL);
  const conn = await mariadb.createConnection({
    ...cfg,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 60000,
    multipleStatements: true,
  });

  const tableRows: Array<Record<string, string>> = await conn.query(
    "SELECT TABLE_NAME AS t, TABLE_TYPE AS ty FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
    [cfg.database]
  );
  const tables = tableRows.map((r) => r.t).sort();

  const out: string[] = [
    "-- AutoShopping backup",
    `-- Fecha: ${new Date().toISOString()}`,
    `-- Base de datos: ${cfg.database}`,
    "SET FOREIGN_KEY_CHECKS=0;",
    "",
  ];

  let totalRows = 0;
  for (const table of tables) {
    const [create] = (await conn.query(`SHOW CREATE TABLE \`${table}\``)) as Array<Record<string, string>>;
    const ddl = create["Create Table"] || create["Create View"] || "";
    if (ddl) {
      out.push(`DROP TABLE IF EXISTS \`${table}\`;`);
      out.push(ddl + ";");
      out.push("");
    }

    if (ddl) {
      const rows = (await conn.query(`SELECT * FROM \`${table}\``)) as Array<Record<string, unknown>>;
      if (rows.length > 0) {
        const cols = Object.keys(rows[0]);
        const colList = cols.map((c) => `\`${c}\``).join(", ");
        const CHUNK = 500;
        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK);
          const values = chunk
            .map((r) => `(${cols.map((c) => sqlValue(r[c])).join(", ")})`)
            .join(",\n");
          out.push(`INSERT INTO \`${table}\` (${colList}) VALUES\n${values};`);
        }
        totalRows += rows.length;
      }
      out.push("");
    }
  }

  out.push("SET FOREIGN_KEY_CHECKS=1;");
  out.push("");

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const now = new Date();
  const stamp = now.toISOString().replace(/[:T]/g, "-").slice(0, 19);
  const file = path.join(OUT_DIR, `autoshopping-${stamp}.sql`);
  fs.writeFileSync(file, out.join("\n"), "utf8");

  const sizeMb = (fs.statSync(file).size / (1024 * 1024)).toFixed(2);
  console.log(`Backup OK: ${file} (${sizeMb} MB, ${tables.length} tablas, ${totalRows} filas)`);

  const files = fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.startsWith("autoshopping-") && f.endsWith(".sql"))
    .sort();
  if (files.length > RETENTION) {
    const toDelete = files.slice(0, files.length - RETENTION);
    for (const f of toDelete) {
      fs.unlinkSync(path.join(OUT_DIR, f));
      console.log(`Eliminado backup antiguo: ${f}`);
    }
  }

  await conn.end();
}

main().catch((e) => {
  console.error("Backup falló:", e.message || e);
  process.exit(1);
});
