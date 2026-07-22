import {
  AIEvaluationStatus,
  AIProviderType,
} from "@prisma/client";

import type {
  AIEvaluationMode,
} from "@prisma/client";

import { prisma } from "../lib/prisma.js";

interface CreateAIModelResultRecord {
  provider: AIProviderType;
  model: string;
  answer?: string;
  latencyMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  status: AIEvaluationStatus;
  errorMessage?: string;
}

interface CreateAIEvaluationRecord {
  companyId: string;
  question: string;
  mode: AIEvaluationMode;
  results: CreateAIModelResultRecord[];
}

export const aiEvaluationRepository = {
  create(input: CreateAIEvaluationRecord) {
    return prisma.aIEvaluation.create({
      data: {
        companyId: input.companyId,
        question: input.question,
        mode: input.mode,

        results: {
          create: input.results,
        },
      },

      include: {
        results: true,
      },
    });
  },

  listByCompany(companyId: string) {
    return prisma.aIEvaluation.findMany({
      where: {
        companyId,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 50,

      include: {
        results: {
          orderBy: {
            provider: "asc",
          },
        },
      },
    });
  },

  aggregateByProvider(
    companyId: string,
    provider: AIProviderType,
  ) {
    return prisma.aIModelResult.aggregate({
      where: {
        provider,
        status: AIEvaluationStatus.SUCCESS,

        evaluation: {
          is: {
            companyId,
          },
        },
      },

      _count: {
        _all: true,
      },

      _avg: {
        latencyMs: true,
        inputTokens: true,
        outputTokens: true,
      },
    });
  },
};