-- CreateEnum
CREATE TYPE "AIEvaluationMode" AS ENUM ('ASK', 'COMPARE');

-- CreateEnum
CREATE TYPE "AIEvaluationStatus" AS ENUM ('SUCCESS', 'ERROR');

-- CreateEnum
CREATE TYPE "AIProviderType" AS ENUM ('OPENAI', 'ANTHROPIC');

-- CreateTable
CREATE TABLE "AIEvaluation" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "mode" "AIEvaluationMode" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "AIEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModelResult" (
    "id" TEXT NOT NULL,
    "provider" "AIProviderType" NOT NULL,
    "model" TEXT NOT NULL,
    "answer" TEXT,
    "latencyMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "status" "AIEvaluationStatus" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluationId" TEXT NOT NULL,

    CONSTRAINT "AIModelResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIEvaluation_companyId_createdAt_idx" ON "AIEvaluation"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "AIModelResult_evaluationId_idx" ON "AIModelResult"("evaluationId");

-- CreateIndex
CREATE INDEX "AIModelResult_provider_createdAt_idx" ON "AIModelResult"("provider", "createdAt");

-- AddForeignKey
ALTER TABLE "AIEvaluation" ADD CONSTRAINT "AIEvaluation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIModelResult" ADD CONSTRAINT "AIModelResult_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "AIEvaluation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
