/*
  Warnings:

  - A unique constraint covering the columns `[studentId]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `user` ADD COLUMN `studentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_studentId_key` ON `user`(`studentId`);
