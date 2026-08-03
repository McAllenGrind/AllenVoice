import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type {
  KnowledgeChunkInput,
} from "../models/knowledge.types.js";

export const knowledgeRepository = {
  getOrCreateBase(companyId: string) {
    return prisma.knowledgeBase.upsert({
      where: {
        companyId,
      },
      update: {},
      create: {
        companyId,
      },
    });
  },

  create(data: Prisma.KnowledgeDocumentCreateInput) {
    return prisma.knowledgeDocument.create({
      data,
    });
  },

  completeProcessing(
  id: string,
  data: Prisma.KnowledgeDocumentUpdateInput,
  chunks: KnowledgeChunkInput[],
  embeddings: number[][],
) {
  if (
    chunks.length !== embeddings.length
  ) {
    throw new Error(
      "Le nombre d’embeddings ne correspond pas au nombre de morceaux.",
    );
  }

  return prisma.$transaction(
    async (transaction) => {
      await transaction
        .knowledgeChunk
        .deleteMany({
          where: {
            documentId: id,
          },
        });

      if (chunks.length > 0) {
        await transaction
          .knowledgeChunk
          .createMany({
            data: chunks.map(
              (chunk) => ({
                documentId: id,
                content: chunk.content,
                chunkIndex:
                  chunk.chunkIndex,

                sectionTitle:
                  chunk.sectionTitle ??
                  null,

                pageNumber:
                  chunk.pageNumber ??
                  null,

                sheetName:
                  chunk.sheetName ??
                  null,

                slideNumber:
                  chunk.slideNumber ??
                  null,

                locatorLabel:
                  chunk.locatorLabel ??
                  null,
              }),
            ),
          });

        for (
          let index = 0;
          index < chunks.length;
          index += 1
        ) {
          const chunk = chunks[index];
          const embedding =
            embeddings[index];

          if (!chunk || !embedding) {
            throw new Error(
              "Un passage ou son embedding est manquant.",
            );
          }

          const vectorValue =
            `[${embedding.join(",")}]`;

          await transaction.$executeRaw`
            UPDATE "KnowledgeChunk"
            SET "embedding" = ${vectorValue}::vector
            WHERE "documentId" = ${id}
              AND "chunkIndex" = ${chunk.chunkIndex}
          `;
        }
      }

      return transaction
        .knowledgeDocument
        .update({
          where: {
            id,
          },

          data,

          include: {
            _count: {
              select: {
                chunks: true,
              },
            },
          },
        });
    },
  );
},

  findAllByCompany(companyId: string) {
    return prisma.knowledgeDocument.findMany({
      where: {
        knowledgeBase: {
          is: {
            companyId,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  findByIdForCompany(id: string, companyId: string) {
    return prisma.knowledgeDocument.findFirst({
      where: {
        id,
        knowledgeBase: {
          is: {
            companyId,
          },
        },
      },
    });
  },

  update(id: string, data: Prisma.KnowledgeDocumentUpdateInput) {
    return prisma.knowledgeDocument.update({
      where: {
        id,
      },
      data,
    });
  },

  delete(id: string) {
    return prisma.knowledgeDocument.delete({
      where: {
        id,
      },
    });
  },
};