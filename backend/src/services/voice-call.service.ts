import {
  AIProviderType,
  VoiceCallStatus,
} from "@prisma/client";

import type {
  AIProvider,
  AIProviderResult,
} from "../models/ai.types.js";

import { voiceCallRepository } from "../repositories/voice-call.repository.js";

interface StartVoiceCallInput {
  companyId: string;
  twilioCallSid: string;
  fromNumber?: string;
  toNumber?: string;
  provider: AIProvider;
}

function toDatabaseProvider(
  provider: AIProvider,
): AIProviderType {
  return provider === "OPENAI"
    ? AIProviderType.OPENAI
    : AIProviderType.ANTHROPIC;
}

function parseOptionalNumber(
  value: string | undefined,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

function getFinalStatus(
  twilioStatus: string | undefined,
): VoiceCallStatus {
  const normalized =
    twilioStatus?.trim().toLowerCase();

  if (normalized === "completed") {
    return VoiceCallStatus.COMPLETED;
  }

  if (
    normalized === "failed" ||
    normalized === "busy" ||
    normalized === "no-answer" ||
    normalized === "canceled"
  ) {
    return VoiceCallStatus.FAILED;
  }

  return VoiceCallStatus.IN_PROGRESS;
}

export const voiceCallService = {
  start(input: StartVoiceCallInput) {
    return voiceCallRepository.start({
      companyId: input.companyId,
      twilioCallSid:
        input.twilioCallSid,
      fromNumber: input.fromNumber,
      toNumber: input.toNumber,
      provider: toDatabaseProvider(
        input.provider,
      ),
    });
  },

  recordCustomerMessage(
    twilioCallSid: string,
    text: string,
    confidenceValue?: string,
  ) {
    return voiceCallRepository.createCustomerMessage({
      twilioCallSid,
      text,
      confidence:
        parseOptionalNumber(confidenceValue),
    });
  },

  recordAgentMessage(
    twilioCallSid: string,
    result: AIProviderResult,
  ) {
    return voiceCallRepository.createAgentMessage({
      twilioCallSid,
      text: result.answer,
      provider: toDatabaseProvider(
        result.provider,
      ),
      model: result.model,
      latencyMs: result.latencyMs,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    });
  },

  complete(
    twilioCallSid: string,
    durationValue?: string,
  ) {
    return voiceCallRepository.finish({
      twilioCallSid,
      status: VoiceCallStatus.COMPLETED,
      durationSeconds:
        parseOptionalNumber(durationValue),
    });
  },

  updateFromTwilioStatus(
    twilioCallSid: string,
    twilioStatus?: string,
    durationValue?: string,
  ) {
    const status =
      getFinalStatus(twilioStatus);

    /*
     * On ne termine pas l’appel pour les statuts
     * intermédiaires comme ringing ou in-progress.
     */
    if (
      status ===
      VoiceCallStatus.IN_PROGRESS
    ) {
      return Promise.resolve();
    }

    return voiceCallRepository.finish({
      twilioCallSid,
      status,
      durationSeconds:
        parseOptionalNumber(durationValue),
    });
  },
};