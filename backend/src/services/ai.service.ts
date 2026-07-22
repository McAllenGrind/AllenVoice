import type {
  AIComparisonFailure,
  AIProvider,
  AIProviderResult,
  AskAIInput,
} from "../models/ai.types.js";

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

function formatFailure(
  provider: AIProvider,
  reason: unknown,
): AIComparisonFailure {
  return {
    provider,
    error:
      reason instanceof Error
        ? reason.message
        : "Erreur inconnue du fournisseur.",
  };
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

    return runProvider(
      provider,
      prepared.systemPrompt,
      prepared.question,
    );
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