-- CreateTable
CREATE TABLE `VehicleMake` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `logo` VARCHAR(191) NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VehicleMake_name_key`(`name`),
    UNIQUE INDEX `VehicleMake_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VehicleModel` (
    `id` VARCHAR(191) NOT NULL,
    `makeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `yearFrom` INTEGER NULL,
    `yearTo` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `VehicleModel_slug_key`(`slug`),
    INDEX `VehicleModel_makeId_idx`(`makeId`),
    UNIQUE INDEX `VehicleModel_makeId_name_key`(`makeId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductVehicle` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `modelId` VARCHAR(191) NOT NULL,
    `yearFrom` INTEGER NULL,
    `yearTo` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProductVehicle_modelId_idx`(`modelId`),
    INDEX `ProductVehicle_productId_idx`(`productId`),
    UNIQUE INDEX `ProductVehicle_productId_modelId_key`(`productId`, `modelId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `VehicleModel` ADD CONSTRAINT `VehicleModel_makeId_fkey` FOREIGN KEY (`makeId`) REFERENCES `VehicleMake`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVehicle` ADD CONSTRAINT `ProductVehicle_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductVehicle` ADD CONSTRAINT `ProductVehicle_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `VehicleModel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
