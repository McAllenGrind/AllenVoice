import type {
  KnowledgeChunkInput,
} from "../models/knowledge.types.js";

import {
  buildKnowledgeChunks,
} from "./knowledge-chunk.service.js";

import {
  createTextEmbeddings,
} from "./embedding.service.js";

import { AppError } from "../utils/app-error.js";

interface BuildKnowledgeIndexInput {
  title: string;
  category?: string | null;
  content: string;
}

export interface KnowledgeIndexResult {
  chunks: KnowledgeChunkInput[];
  embeddings: number[][];
}

export async function buildKnowledgeIndex(
  input: BuildKnowledgeIndexInput,
): Promise<KnowledgeIndexResult> {
  const chunks = buildKnowledgeChunks({
    content: input.content,
    documentTitle: input.title,
  });

  if (chunks.length === 0) {
    throw new AppError(
      400,
      "Aucun passage exploitable n’a pu être créé à partir du document.",
    );
  }

  const embeddingTexts = chunks.map(
    (chunk) => {
      const parts = [
        `Document : ${input.title}`,
      ];

      if (input.category) {
        parts.push(
          `Catégorie : ${input.category}`,
        );
      }

      if (chunk.sectionTitle) {
        parts.push(
          `Section : ${chunk.sectionTitle}`,
        );
      }

      parts.push(chunk.content);

      return parts.join("\n");
    },
  );

  const embeddings =
    await createTextEmbeddings(
      embeddingTexts,
    );

  if (
    embeddings.length !== chunks.length
  ) {
    throw new AppError(
      502,
      "Le nombre d’embeddings générés ne correspond pas au nombre de passages.",
    );
  }

  return {
    chunks,
    embeddings,
  };
}