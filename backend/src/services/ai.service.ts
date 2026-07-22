import {
  AIEvaluationMode,
  AIEvaluationStatus,
  AIProviderType,
} from "@prisma/client";

import { aiRuntimeConfig } from "../config/ai-runtime.js";

import type {
  AIComparisonFailure,
  AIProvider,
  AIProviderResult,
  AskAIInput,
} from "../models/ai.types.js";

import { aiEvaluationRepository } from "../repositories/ai-evaluation.repository.js";
import { aiRepository } from "../repositories/ai.repository.js";

import { AppError } from "../utils/app-error.js";
import { generateWithAnthropic } from "./ai/anthropic.provider.js";
import { generateWithOpenAI } from "./ai/openai.provider.js";
import { buildAgentSystemPrompt } from "./ai-prompt.service.js";

function parseProvider(
  provider: string | undefined,
): AIProvider {
  const normalizedProvider = (
    provider ?? "OPENAI"
  ).toUpperCase();

  if (
    normalizedProvider !== "OPENAI" &&
    normalizedProvider !== "ANTHROPIC"
  ) {
    throw new AppError(
      400,
      "Le fournisseur doit être OPENAI ou ANTHROPIC.",
    );
  }

  return normalizedProvider;
}

async function prepareRequest(
  companyId: string,
  questionValue: string | undefined,
) {
  const question = questionValue?.trim();

  if (!question) {
    throw new AppError(
      400,
      "La question est obligatoire.",
    );
  }

  const company =
    await aiRepository.getCompanyContext(companyId);

  if (!company) {
    throw new AppError(
      404,
      "Entreprise introuvable.",
    );
  }

  if (!company.isActive) {
    throw new AppError(
      403,
      "Le compte de cette entreprise est désactivé.",
    );
  }

  if (!company.aiConfiguration) {
    throw new AppError(
      409,
      "La configuration IA de l’entreprise est absente.",
    );
  }

  const documents =
    company.knowledgeBase?.documents ?? [];

  if (documents.length === 0) {
    throw new AppError(
      409,
      "Ajoutez au moins une connaissance active avant d’interroger l’agent.",
    );
  }

  const systemPrompt = buildAgentSystemPrompt({
    companyName: company.name,
    language: company.aiConfiguration.language,
    customSystemPrompt:
      company.aiConfiguration.systemPrompt,
    documents,
  });

  return {
    question,
    systemPrompt,
  };
}

async function runProvider(
  provider: AIProvider,
  systemPrompt: string,
  question: string,
): Promise<AIProviderResult> {
  if (provider === "ANTHROPIC") {
    return generateWithAnthropic({
      systemPrompt,
      question,
    });
  }

  return generateWithOpenAI({
    systemPrompt,
    question,
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Erreur inconnue du fournisseur.";
}

function formatFailure(
  provider: AIProvider,
  reason: unknown,
): AIComparisonFailure {
  return {
    provider,
    error: getErrorMessage(reason),
  };
}

function toDatabaseProvider(
  provider: AIProvider,
): AIProviderType {
  return provider === "OPENAI"
    ? AIProviderType.OPENAI
    : AIProviderType.ANTHROPIC;
}

function getProviderModel(
  provider: AIProvider,
): string {
  return provider === "OPENAI"
    ? aiRuntimeConfig.openAIModel
    : aiRuntimeConfig.anthropicModel;
}

/*
 * L’historique ne doit pas empêcher l’IA de répondre.
 * Si l’enregistrement échoue, l’erreur apparaît dans
 * le terminal, mais la réponse IA reste disponible.
 */
async function recordEvaluationSafely(
  input: Parameters<
    typeof aiEvaluationRepository.create
  >[0],
): Promise<void> {
  try {
    await aiEvaluationRepository.create(input);
  } catch (error) {
    console.error(
      "Impossible d’enregistrer l’évaluation IA :",
      error,
    );
  }
}

export const aiService = {
  async ask(
    companyId: string,
    input: AskAIInput,
  ) {
    const prepared = await prepareRequest(
      companyId,
      input.question,
    );

    const provider = parseProvider(input.provider);

    try {
      const result = await runProvider(
        provider,
        prepared.systemPrompt,
        prepared.question,
      );

      await recordEvaluationSafely({
        companyId,
        question: prepared.question,
        mode: AIEvaluationMode.ASK,

        results: [
          {
            provider:
              toDatabaseProvider(result.provider),

            model: result.model,
            answer: result.answer,
            latencyMs: result.latencyMs,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            status: AIEvaluationStatus.SUCCESS,
          },
        ],
      });

      return result;
    } catch (error) {
      await recordEvaluationSafely({
        companyId,
        question: prepared.question,
        mode: AIEvaluationMode.ASK,

        results: [
          {
            provider:
              toDatabaseProvider(provider),

            model: getProviderModel(provider),
            status: AIEvaluationStatus.ERROR,
            errorMessage: getErrorMessage(error),
          },
        ],
      });

      throw error;
    }
  },

  async compare(
    companyId: string,
    input: AskAIInput,
  ) {
    const prepared = await prepareRequest(
      companyId,
      input.question,
    );

    const [openAIResult, anthropicResult] =
      await Promise.allSettled([
        runProvider(
          "OPENAI",
          prepared.systemPrompt,
          prepared.question,
        ),

        runProvider(
          "ANTHROPIC",
          prepared.systemPrompt,
          prepared.question,
        ),
      ]);

    await recordEvaluationSafely({
      companyId,
      question: prepared.question,
      mode: AIEvaluationMode.COMPARE,

      results: [
        openAIResult.status === "fulfilled"
          ? {
              provider: AIProviderType.OPENAI,
              model: openAIResult.value.model,
              answer: openAIResult.value.answer,
              latencyMs:
                openAIResult.value.latencyMs,
              inputTokens:
                openAIResult.value.inputTokens,
              outputTokens:
                openAIResult.value.outputTokens,
              status:
                AIEvaluationStatus.SUCCESS,
            }
          : {
              provider: AIProviderType.OPENAI,
              model:
                aiRuntimeConfig.openAIModel,
              status: AIEvaluationStatus.ERROR,
              errorMessage: getErrorMessage(
                openAIResult.reason,
              ),
            },

        anthropicResult.status === "fulfilled"
          ? {
              provider:
                AIProviderType.ANTHROPIC,
              model:
                anthropicResult.value.model,
              answer:
                anthropicResult.value.answer,
              latencyMs:
                anthropicResult.value.latencyMs,
              inputTokens:
                anthropicResult.value.inputTokens,
              outputTokens:
                anthropicResult.value.outputTokens,
              status:
                AIEvaluationStatus.SUCCESS,
            }
          : {
              provider:
                AIProviderType.ANTHROPIC,
              model:
                aiRuntimeConfig.anthropicModel,
              status: AIEvaluationStatus.ERROR,
              errorMessage: getErrorMessage(
                anthropicResult.reason,
              ),
            },
      ],
    });

    return {
      question: prepared.question,

      results: {
        openAI:
          openAIResult.status === "fulfilled"
            ? openAIResult.value
            : formatFailure(
                "OPENAI",
                openAIResult.reason,
              ),

        anthropic:
          anthropicResult.status === "fulfilled"
            ? anthropicResult.value
            : formatFailure(
                "ANTHROPIC",
                anthropicResult.reason,
              ),
      },
    };
  },
};