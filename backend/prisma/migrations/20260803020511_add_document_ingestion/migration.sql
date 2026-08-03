-- CreateEnum
CREATE TYPE "KnowledgeDocumentStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "KnowledgeAudience" AS ENUM ('CUSTOMER', 'INTERNAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "KnowledgeSourceType" ADD VALUE 'EXCEL';
ALTER TYPE "KnowledgeSourceType" ADD VALUE 'POWERPOINT';
ALTER TYPE "KnowledgeSourceType" ADD VALUE 'CSV';
ALTER TYPE "KnowledgeSourceType" ADD VALUE 'TXT';
ALTER TYPE "KnowledgeSourceType" ADD VALUE 'IMAGE';

-- AlterTable
ALTER TABLE "KnowledgeDocument" ADD COLUMN     "audience" "KnowledgeAudience" NOT NULL DEFAULT 'CUSTOMER',
ADD COLUMN     "extractionMode" TEXT,
ADD COLUMN     "failureReason" TEXT,
ADD COLUMN     "fileName" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "mimeType" TEXT,
ADD COLUMN     "pageCount" INTEGER,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "status" "KnowledgeDocumentStatus" NOT NULL DEFAULT 'READY',
ADD COLUMN     "storageKey" TEXT,
ALTER COLUMN "content" SET DEFAULT '';

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "sectionTitle" TEXT,
    "pageNumber" INTEGER,
    "sheetName" TEXT,
    "slideNumber" INTEGER,
    "locatorLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeChunk_documentId_idx" ON "KnowledgeChunk"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChunk_documentId_chunkIndex_key" ON "KnowledgeChunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE INDEX "KnowledgeDocument_knowledgeBaseId_status_isActive_idx" ON "KnowledgeDocument"("knowledgeBaseId", "status", "isActive");

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "KnowledgeDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
