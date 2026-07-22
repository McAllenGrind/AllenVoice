import {
  AIProviderType,
} from "@prisma/client";

import { aiEvaluationRepository } from "../repositories/ai-evaluation.repository.js";

function roundAverage(
  value: number | null,
): number | null {
  if (value === null) {
    return null;
  }

  return Math.round(value);
}

export const aiEvaluationService = {
  list(companyId: string) {
    return aiEvaluationRepository.listByCompany(
      companyId,
    );
  },

  async getStatistics(companyId: string) {
    const [openAIStats, anthropicStats] =
      await Promise.all([
        aiEvaluationRepository.aggregateByProvider(
          companyId,
          AIProviderType.OPENAI,
        ),

        aiEvaluationRepository.aggregateByProvider(
          companyId,
          AIProviderType.ANTHROPIC,
        ),
      ]);

    return {
      openAI: {
        provider: AIProviderType.OPENAI,
        successfulTests: openAIStats._count._all,

        averageLatencyMs: roundAverage(
          openAIStats._avg.latencyMs,
        ),

        averageInputTokens: roundAverage(
          openAIStats._avg.inputTokens,
        ),

        averageOutputTokens: roundAverage(
          openAIStats._avg.outputTokens,
        ),
      },

      anthropic: {
        provider: AIProviderType.ANTHROPIC,
        successfulTests:
          anthropicStats._count._all,

        averageLatencyMs: roundAverage(
          anthropicStats._avg.latencyMs,
        ),

        averageInputTokens: roundAverage(
          anthropicStats._avg.inputTokens,
        ),

        averageOutputTokens: roundAverage(
          anthropicStats._avg.outputTokens,
        ),
      },
    };
  },
};