import { prisma } from "../lib/prisma.js";

export interface KnowledgeSearchResultRow {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  category: string | null;
  content: string;
  locatorLabel: string | null;
  similarity: number;
}

interface SearchRelevantChunksInput {
  companyId: string;
  vectorValue: string;
  maxResults: number;
  minSimilarity: number;
}

export const knowledgeSearchRepository = {
  searchRelevantChunks(
    input: SearchRelevantChunksInput,
  ) {
    return prisma.$queryRaw<
      KnowledgeSearchResultRow[]
    >`
      WITH query_vector AS (
        SELECT ${input.vectorValue}::vector AS embedding
      )

      SELECT
        c.id AS "chunkId",
        c."documentId",
        d.title AS "documentTitle",
        d.category,
        c.content,
        c."locatorLabel",

        1 - (
          c.embedding <=> query_vector.embedding
        ) AS similarity

      FROM "KnowledgeChunk" AS c

      INNER JOIN "KnowledgeDocument" AS d
        ON d.id = c."documentId"

      INNER JOIN "KnowledgeBase" AS kb
        ON kb.id = d."knowledgeBaseId"

      CROSS JOIN query_vector

      WHERE
        kb."companyId" = ${input.companyId}
        AND d."isActive" = true
        AND d.status = 'READY'
        AND d.audience = 'CUSTOMER'
        AND c.embedding IS NOT NULL

        AND (
          1 - (
            c.embedding <=>
            query_vector.embedding
          )
        ) >= ${input.minSimilarity}

      ORDER BY
        c.embedding <=>
        query_vector.embedding

      LIMIT ${input.maxResults}
    `;
  },
};