-- DropForeignKey
ALTER TABLE `OrderItem` DROP FOREIGN KEY `OrderItem_productId_fkey`;

-- DropIndex
DROP INDEX `OrderItem_productId_fkey` ON `OrderItem`;

-- AlterTable
ALTER TABLE `OrderItem` MODIFY `productId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `Setting` MODIFY `value` TEXT NOT NULL;

-- CreateTable
CREATE TABLE `PaymentMethod` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'efectivo',
    `icon` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `commission` DOUBLE NOT NULL DEFAULT 0,
    `minAmount` DOUBLE NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentMethod_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;