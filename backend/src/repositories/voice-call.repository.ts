import {
  AIProviderType,
  VoiceCallStatus,
  VoiceMessageRole,
} from "@prisma/client";

import { prisma } from "../lib/prisma.js";

interface StartVoiceCallInput {
  companyId: string;
  twilioCallSid: string;
  fromNumber?: string;
  toNumber?: string;
  provider?: AIProviderType;
}

interface CreateCustomerMessageInput {
  twilioCallSid: string;
  text: string;
  confidence?: number;
}

interface CreateAgentMessageInput {
  twilioCallSid: string;
  text: string;
  provider: AIProviderType;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

interface FinishVoiceCallInput {
  twilioCallSid: string;
  status: VoiceCallStatus;
  durationSeconds?: number;
}

export const voiceCallRepository = {
  start(input: StartVoiceCallInput) {
    return prisma.voiceCall.upsert({
      where: {
        twilioCallSid: input.twilioCallSid,
      },

      update: {
        fromNumber: input.fromNumber,
        toNumber: input.toNumber,
        provider: input.provider,
        status: VoiceCallStatus.IN_PROGRESS,
      },

      create: {
        companyId: input.companyId,
        twilioCallSid: input.twilioCallSid,
        fromNumber: input.fromNumber,
        toNumber: input.toNumber,
        provider: input.provider,
        status: VoiceCallStatus.IN_PROGRESS,
      },
    });
  },

  createCustomerMessage(
    input: CreateCustomerMessageInput,
  ) {
    return prisma.voiceMessage.create({
      data: {
        role: VoiceMessageRole.CUSTOMER,
        text: input.text,
        confidence: input.confidence,

        call: {
          connect: {
            twilioCallSid:
              input.twilioCallSid,
          },
        },
      },
    });
  },

  createAgentMessage(
    input: CreateAgentMessageInput,
  ) {
    return prisma.voiceMessage.create({
      data: {
        role: VoiceMessageRole.AGENT,
        text: input.text,
        provider: input.provider,
        model: input.model,
        latencyMs: input.latencyMs,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,

        call: {
          connect: {
            twilioCallSid:
              input.twilioCallSid,
          },
        },
      },
    });
  },

  finish(input: FinishVoiceCallInput) {
    return prisma.voiceCall.updateMany({
      where: {
        twilioCallSid: input.twilioCallSid,
      },

      data: {
        status: input.status,
        durationSeconds:
          input.durationSeconds,
        endedAt: new Date(),
      },
    });
  },
};