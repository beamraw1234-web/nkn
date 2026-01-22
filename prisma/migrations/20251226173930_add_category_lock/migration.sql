/*
  Warnings:

  - A unique constraint covering the columns `[userId,categoryId]` on the table `CategoryLock` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `CategoryLock_userId_categoryId_key` ON `CategoryLock`(`userId`, `categoryId`);
