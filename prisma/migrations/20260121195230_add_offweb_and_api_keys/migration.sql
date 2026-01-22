-- CreateTable
CREATE TABLE `offweb` (
    `id` VARCHAR(191) NOT NULL,
    `is_off` BOOLEAN NOT NULL DEFAULT false,
    `message` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `api_key_hash` VARCHAR(191) NOT NULL,
    `api_key_prefix` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_seen` DATETIME(3) NULL,
    `last_ip` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `api_keys_is_active_idx`(`is_active`),
    INDEX `api_keys_last_seen_idx`(`last_seen`),
    UNIQUE INDEX `api_keys_api_key_prefix_key`(`api_key_prefix`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
