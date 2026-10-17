/*
  Warnings:

  - You are about to drop the column `data` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `sessionId` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Session` table. All the data in the column will be lost.
  - Added the required column `expiresAt` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Session_sessionId_key` ON `Session`;

-- AlterTable
ALTER TABLE `Session` DROP COLUMN `data`,
    DROP COLUMN `sessionId`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `expiresAt` DATETIME(3) NOT NULL,
    ADD COLUMN `ipAddress` VARCHAR(191) NULL,
    ADD COLUMN `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `revokedAt` DATETIME(3) NULL,
    ADD COLUMN `userAgent` VARCHAR(191) NULL,
    ADD COLUMN `userId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `User` ADD COLUMN `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `lockedUntil` DATETIME(3) NULL,
    ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `passwordChangedAt` DATETIME(3) NULL,
    ADD COLUMN `twoFactorEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `twoFactorRecovery` TEXT NULL,
    ADD COLUMN `twoFactorSecret` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `LoginAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `ipAddress` VARCHAR(191) NULL,
    `success` BOOLEAN NOT NULL DEFAULT false,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `LoginAttempt_email_createdAt_idx`(`email`, `createdAt`),
    INDEX `LoginAttempt_ipAddress_createdAt_idx`(`ipAddress`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Session_userId_idx` ON `Session`(`userId`);

-- CreateIndex
CREATE INDEX `Session_expiresAt_idx` ON `Session`(`expiresAt`);

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoginAttempt` ADD CONSTRAINT `LoginAttempt_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Fase 1 (seguridad): todos los usuarios existentes deben cambiar su contraseña en el primer inicio de sesión
UPDATE `User` SET `mustChangePassword` = true WHERE `mustChangePassword` = false;
