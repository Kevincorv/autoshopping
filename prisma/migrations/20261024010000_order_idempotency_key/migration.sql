-- AutoShopping 2.0: idempotencia en la creación de pedidos.
-- Evita pedidos duplicados cuando el cliente reintenta tras un timeout/reconexión.
ALTER TABLE `Order` ADD COLUMN `idempotencyKey` VARCHAR(191) NULL;

-- MySQL/TiDB permiten múltiples NULL en un índice único; solo colisiona la clave real.
CREATE UNIQUE INDEX `Order_idempotencyKey_key` ON `Order`(`idempotencyKey`);
