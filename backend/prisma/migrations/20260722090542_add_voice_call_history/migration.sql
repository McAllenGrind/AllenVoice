-- CreateEnum
CREATE TYPE "VoiceCallStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "VoiceMessageRole" AS ENUM ('CUSTOMER', 'AGENT');

-- CreateTable
CREATE TABLE "VoiceCall" (
    "id" TEXT NOT NULL,
    "twilioCallSid" TEXT NOT NULL,
    "fromNumber" TEXT,
    "toNumber" TEXT,
    "status" "VoiceCallStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "provider" "AIProviderType",
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "VoiceCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceMessage" (
    "id" TEXT NOT NULL,
    "role" "VoiceMessageRole" NOT NULL,
    "text" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "provider" "AIProviderType",
    "model" TEXT,
    "latencyMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "callId" TEXT NOT NULL,

    CONSTRAINT "VoiceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoiceCall_twilioCallSid_key" ON "VoiceCall"("twilioCallSid");

-- CreateIndex
CREATE INDEX "VoiceCall_companyId_startedAt_idx" ON "VoiceCall"("companyId", "startedAt");

-- CreateIndex
CREATE INDEX "VoiceCall_status_idx" ON "VoiceCall"("status");

-- CreateIndex
CREATE INDEX "VoiceMessage_callId_createdAt_idx" ON "VoiceMessage"("callId", "createdAt");

-- AddForeignKey
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceMessage" ADD CONSTRAINT "VoiceMessage_callId_fkey" FOREIGN KEY ("callId") REFERENCES "VoiceCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
