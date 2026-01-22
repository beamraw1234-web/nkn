-- CreateTable
CREATE TABLE `downloadpayment` (
    `id` VARCHAR(191) NOT NULL,
    `shareToken` VARCHAR(191) NOT NULL,
    `omiseChargeId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `currency` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `qrImageUrl` TEXT NULL,
    `expiresAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DownloadPayment_shareToken_key`(`shareToken`),
    UNIQUE INDEX `DownloadPayment_omiseChargeId_key`(`omiseChargeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

