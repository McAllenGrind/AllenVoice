/*
  Warnings:

  - A unique constraint covering the columns `[voicePhoneNumber]` on the table `Company` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "voicePhoneNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Company_voicePhoneNumber_key" ON "Company"("voicePhoneNumber");
