-- CreateTable
CREATE TABLE `SeasonalThemeSettings` (
    `id` VARCHAR(191) NOT NULL,
    `currentTheme` VARCHAR(191) NOT NULL DEFAULT 'default',
    `snowEnabled` BOOLEAN NOT NULL DEFAULT false,
    `fireworksEnabled` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,
    `updatedBy` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
