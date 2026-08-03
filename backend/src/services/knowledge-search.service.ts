import {
  knowledgeSearchRepository,
} from "../repositories/knowledge-search.repository.js";

import {
  createTextEmbeddings,
} from "./embedding.service.js";

import { AppError } from "../utils/app-error.js";

const DEFAULT_MAX_RESULTS = 5;
const MAX_ALLOWED_RESULTS = 10;
const DEFAULT_MIN_SIMILARITY = 0.35;

function parseConfiguredMaxResults(): number {
  const configuredValue = Number.parseInt(
    process.env.AI_KNOWLEDGE_MAX_CHUNKS ??
      "",
    10,
  );

  if (
    !Number.isInteger(configuredValue) ||
    configuredValue < 1
  ) {
    return DEFAULT_MAX_RESULTS;
  }

  return Math.min(
    configuredValue,
    MAX_ALLOWED_RESULTS,
  );
}

function parseMinimumSimilarity(): number {
  const configuredValue = Number(
    process.env
      .AI_KNOWLEDGE_MIN_SIMILARITY,
  );

  if (
    !Number.isFinite(configuredValue) ||
    configuredValue < -1 ||
    configuredValue > 1
  ) {
    return DEFAULT_MIN_SIMILARITY;
  }

  return configuredValue;
}

function parseRequestedLimit(
  requestedLimit: number | undefined,
): number {
  const configuredMaximum =
    parseConfiguredMaxResults();

  if (
    requestedLimit === undefined ||
    !Number.isInteger(requestedLimit)
  ) {
    return configuredMaximum;
  }

  return Math.max(
    1,
    Math.min(
      requestedLimit,
      configuredMaximum,
      MAX_ALLOWED_RESULTS,
    ),
  );
}

export const knowledgeSearchService = {
  async search(
    companyId: string,
    queryValue: string | undefined,
    requestedLimit?: number,
  ) {
    const query = queryValue?.trim();

    if (!query) {
      throw new AppError(
        400,
        "La question à rechercher est obligatoire.",
      );
    }

    if (query.length < 3) {
      throw new AppError(
        400,
        "La question est trop courte.",
      );
    }

    if (query.length > 2_000) {
      throw new AppError(
        400,
        "La question est trop longue.",
      );
    }

    const embeddings =
      await createTextEmbeddings([
        query,
      ]);

    const queryEmbedding =
      embeddings[0];

    if (!queryEmbedding) {
      throw new AppError(
        502,
        "L’embedding de la question n’a pas été généré.",
      );
    }

    const vectorValue =
      `[${queryEmbedding.join(",")}]`;

    const maxResults =
      parseRequestedLimit(
        requestedLimit,
      );

    const minSimilarity =
      parseMinimumSimilarity();

    return knowledgeSearchRepository
      .searchRelevantChunks({
        companyId,
        vectorValue,
        maxResults,
        minSimilarity,
      });
  },
};