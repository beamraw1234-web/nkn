/*
  Warnings:

  - You are about to drop the column `description` on the `category` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `file` table. All the data in the column will be lost.
  - You are about to drop the column `isHiddenGlobal` on the `file` table. All the data in the column will be lost.
  - You are about to drop the column `originalName` on the `file` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `file` table. All the data in the column will be lost.
  - You are about to drop the column `storedName` on the `file` table. All the data in the column will be lost.
  - You are about to drop the column `uploaderId` on the `file` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `fileshare` table. All the data in the column will be lost.
  - You are about to drop the `filevisibility` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[storageKey]` on the table `File` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `File` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storageKey` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `file` DROP FOREIGN KEY `File_uploaderId_fkey`;

-- DropForeignKey
ALTER TABLE `filevisibility` DROP FOREIGN KEY `FileVisibility_fileId_fkey`;

-- DropIndex
DROP INDEX `File_storedName_key` ON `file`;

-- AlterTable
ALTER TABLE `category` DROP COLUMN `description`,
    ADD COLUMN `createdBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `file` DROP COLUMN `isDeleted`,
    DROP COLUMN `isHiddenGlobal`,
    DROP COLUMN `originalName`,
    DROP COLUMN `passwordHash`,
    DROP COLUMN `storedName`,
    DROP COLUMN `uploaderId`,
    ADD COLUMN `createdBy` VARCHAR(191) NULL,
    ADD COLUMN `expiresAt` DATETIME(3) NULL,
    ADD COLUMN `isHidden` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `name` VARCHAR(191) NOT NULL,
    ADD COLUMN `password` VARCHAR(191) NULL,
    ADD COLUMN `storageKey` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `fileshare` DROP COLUMN `passwordHash`,
    ADD COLUMN `downloads` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `maxDownloads` INTEGER NULL,
    ADD COLUMN `password` VARCHAR(191) NULL,
    MODIFY `createdBy` VARCHAR(191) NULL;

-- DropTable
DROP TABLE `filevisibility`;

-- CreateTable
CREATE TABLE `FileLog` (
    `id` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NULL,
    `username` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `ip` VARCHAR(191) NULL,
    `role` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FileHidden` (
    `id` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `hidden` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `File_storageKey_key` ON `File`(`storageKey`);

-- AddForeignKey
ALTER TABLE `FileLog` ADD CONSTRAINT `FileLog_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `File`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FileHidden` ADD CONSTRAINT `FileHidden_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `File`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
