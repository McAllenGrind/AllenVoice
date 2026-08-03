import OpenAI from "openai";

import { AppError } from "../utils/app-error.js";

const EMBEDDING_MODEL =
  "text-embedding-3-small";

const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_BATCH_SIZE = 50;

let openAIClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  const apiKey =
    process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new AppError(
      500,
      "La variable OPENAI_API_KEY est absente.",
    );
  }

  if (!openAIClient) {
    openAIClient = new OpenAI({
      apiKey,
    });
  }

  return openAIClient;
}

function normalizeEmbeddingText(
  text: string,
): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function validateEmbedding(
  embedding: number[],
): void {
  if (
    embedding.length !==
    EMBEDDING_DIMENSIONS
  ) {
    throw new AppError(
      502,
      `OpenAI a retourné un vecteur de ${embedding.length} dimensions au lieu de ${EMBEDDING_DIMENSIONS}.`,
    );
  }

  const containsInvalidValue =
    embedding.some(
      (value) =>
        typeof value !== "number" ||
        !Number.isFinite(value),
    );

  if (containsInvalidValue) {
    throw new AppError(
      502,
      "OpenAI a retourné un embedding invalide.",
    );
  }
}

export async function createTextEmbeddings(
  texts: string[],
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const normalizedTexts =
    texts.map(normalizeEmbeddingText);

  if (
    normalizedTexts.some(
      (text) => !text,
    )
  ) {
    throw new AppError(
      400,
      "Un passage vide ne peut pas recevoir d’embedding.",
    );
  }

  const client = getOpenAIClient();
  const embeddings: number[][] = [];

  for (
    let startIndex = 0;
    startIndex < normalizedTexts.length;
    startIndex += EMBEDDING_BATCH_SIZE
  ) {
    const batch = normalizedTexts.slice(
      startIndex,
      startIndex +
        EMBEDDING_BATCH_SIZE,
    );

    try {
      const response =
        await client.embeddings.create({
          model: EMBEDDING_MODEL,
          input: batch,
          dimensions:
            EMBEDDING_DIMENSIONS,
          encoding_format: "float",
        });

      const orderedResults = [
        ...response.data,
      ].sort(
        (first, second) =>
          first.index - second.index,
      );

      if (
        orderedResults.length !==
        batch.length
      ) {
        throw new AppError(
          502,
          "OpenAI n’a pas retourné un embedding pour chaque passage.",
        );
      }

      for (const result of orderedResults) {
        validateEmbedding(
          result.embedding,
        );

        embeddings.push(
          result.embedding,
        );
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      console.error(
        "OpenAI embedding error:",
        error,
      );

      throw new AppError(
        502,
        "La génération des embeddings a échoué.",
      );
    }
  }

  return embeddings;
}