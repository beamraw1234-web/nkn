/*
  Warnings:

  - A unique constraint covering the columns `[inviteToken]` on the table `voicecall` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `voicecall` ADD COLUMN `inviteToken` VARCHAR(191) NULL,
    ADD COLUMN `isPublic` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `password` VARCHAR(191) NULL,
    ADD COLUMN `roomName` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `voicecall_inviteToken_key` ON `voicecall`(`inviteToken`);

-- CreateIndex
CREATE INDEX `voicecall_isPublic_idx` ON `voicecall`(`isPublic`);

-- CreateIndex
CREATE INDEX `voicecall_inviteToken_idx` ON `voicecall`(`inviteToken`);
