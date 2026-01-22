-- AlterTable
ALTER TABLE `seasonalthemesettings` ADD COLUMN `effectColor` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
    ADD COLUMN `effectEnabled` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `effectIntensity` DOUBLE NOT NULL DEFAULT 1.0,
    ADD COLUMN `effectMaxParticles` INTEGER NOT NULL DEFAULT 100,
    ADD COLUMN `effectSpeed` DOUBLE NOT NULL DEFAULT 1.0;
