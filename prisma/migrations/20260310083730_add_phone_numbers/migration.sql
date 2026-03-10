/*
  Warnings:

  - You are about to drop the column `ownerPhone` on the `Flat` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Flat" DROP COLUMN "ownerPhone";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "phone";
