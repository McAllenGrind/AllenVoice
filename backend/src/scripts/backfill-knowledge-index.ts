import { prisma } from "../lib/prisma.js";

import {
  knowledgeRepository,
} from "../repositories/knowledge.repository.js";

import {
  buildKnowledgeIndex,
} from "../services/knowledge-indexing.service.js";

interface DocumentToIndex {
  id: string;
  title: string;
  category: string | null;
  content: string;
}

async function findDocumentsToIndex(): Promise<
  DocumentToIndex[]
> {
  return prisma.$queryRaw<DocumentToIndex[]>`
    SELECT
      d.id,
      d.title,
      d.category,
      d.content

    FROM "KnowledgeDocument" AS d

    WHERE
      d.status = 'READY'
      AND LENGTH(TRIM(d.content)) > 0

      AND (
        NOT EXISTS (
          SELECT 1
          FROM "KnowledgeChunk" AS c
          WHERE c."documentId" = d.id
        )

        OR EXISTS (
          SELECT 1
          FROM "KnowledgeChunk" AS c
          WHERE
            c."documentId" = d.id
            AND c.embedding IS NULL
        )
      )

    ORDER BY d."createdAt" ASC
  `;
}

async function main(): Promise<void> {
  const documents =
    await findDocumentsToIndex();

  console.log(
    `${documents.length} document(s) à indexer.`,
  );

  let successCount = 0;
  let failureCount = 0;

  for (const document of documents) {
    try {
      console.log(
        `Indexation : ${document.title}`,
      );

      const {
        chunks,
        embeddings,
      } = await buildKnowledgeIndex({
        title: document.title,
        category: document.category,
        content: document.content,
      });

      await knowledgeRepository.completeProcessing(
        document.id,
        {
          status: "READY",
          failureReason: null,
          processedAt: new Date(),
        },
        chunks,
        embeddings,
      );

      successCount += 1;

      console.log(
        `OK : ${document.title} (${chunks.length} passage(s))`,
      );
    } catch (error) {
      failureCount += 1;

      console.error(
        `ECHEC : ${document.title}`,
        error,
      );
    }
  }

  console.log("");
  console.log(
    `Terminés : ${successCount}`,
  );
  console.log(
    `Échecs : ${failureCount}`,
  );
}

main()
  .catch((error) => {
    console.error(
      "Échec du backfill :",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });