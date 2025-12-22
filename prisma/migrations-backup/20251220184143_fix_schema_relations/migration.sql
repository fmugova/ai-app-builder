/*
  Warnings:

  - You are about to drop the column `bio` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `githubAccessToken` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `githubUsername` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `promoCodeUsed` on the `User` table. All the data in the column will be lost.
  - Added the required column `userId` to the `DripEnrollment` table without a default value. This is not possible if the table is not empty.
  - Made the column `discountRate` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "DripEnrollment" ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "bio",
DROP COLUMN "githubAccessToken",
DROP COLUMN "githubUsername",
DROP COLUMN "promoCodeUsed",
ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currentPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "currentPeriodStart" TIMESTAMP(3),
ALTER COLUMN "discountRate" SET NOT NULL,
ALTER COLUMN "generationsLimit" SET DEFAULT 10,
ALTER COLUMN "subscriptionResetDate" DROP NOT NULL,
ALTER COLUMN "subscriptionResetDate" DROP DEFAULT,
ALTER COLUMN "theme" SET DEFAULT 'dark';

-- CreateIndex
CREATE INDEX "DripEnrollment_userId_idx" ON "DripEnrollment"("userId");

-- AddForeignKey
ALTER TABLE "DripEnrollment" ADD CONSTRAINT "DripEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
