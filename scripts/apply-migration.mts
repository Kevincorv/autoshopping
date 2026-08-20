import mariadb from "mariadb";

const url = new URL(process.env.DATABASE_URL);
const conn = await mariadb.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ""),
  ssl: { rejectUnauthorized: false },
});

const sql = `
ALTER TABLE \`OrderItem\` DROP FOREIGN KEY \`OrderItem_productId_fkey\`;
ALTER TABLE \`OrderItem\` DROP INDEX \`OrderItem_productId_fkey\`;
ALTER TABLE \`OrderItem\` MODIFY \`productId\` VARCHAR(191) NULL;
ALTER TABLE \`Setting\` MODIFY \`value\` TEXT NOT NULL;
CREATE TABLE IF NOT EXISTS \`PaymentMethod\` (
    \`id\` VARCHAR(191) NOT NULL,
    \`name\` VARCHAR(191) NOT NULL,
    \`type\` VARCHAR(191) NOT NULL DEFAULT 'efectivo',
    \`icon\` VARCHAR(191) NULL,
    \`description\` VARCHAR(191) NULL,
    \`commission\` DOUBLE NOT NULL DEFAULT 0,
    \`minAmount\` DOUBLE NOT NULL DEFAULT 0,
    \`isActive\` BOOLEAN NOT NULL DEFAULT true,
    \`sortOrder\` INTEGER NOT NULL DEFAULT 0,
    \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updatedAt\` DATETIME(3) NOT NULL,
    UNIQUE INDEX \`PaymentMethod_name_key\`(\`name\`),
    PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE \`OrderItem\` ADD CONSTRAINT \`OrderItem_productId_fkey\` FOREIGN KEY (\`productId\`) REFERENCES \`Product\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE;
`;

const statements = sql.split(";").filter((s) => s.trim());
for (const stmt of statements) {
  try {
    await conn.query(stmt);
    console.log("OK:", stmt.slice(0, 80));
  } catch (e) {
    console.log("ERROR:", e.message, "| stmt:", stmt.slice(0, 80));
  }
}
await conn.end();
console.log("done");