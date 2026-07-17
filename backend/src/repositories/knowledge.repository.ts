import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

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