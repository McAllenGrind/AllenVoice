import { prisma } from "../lib/prisma.js";

export const aiRepository = {
  getCompanyContext(companyId: string) {
    return prisma.company.findUnique({
      where: {
        id: companyId,
      },

      select: {
        id: true,
        name: true,
        isActive: true,

        aiConfiguration: {
          select: {
            systemPrompt: true,
            language: true,
          },
        },

        knowledgeBase: {
          select: {
            documents: {
              where: {
                isActive: true,
              },

              orderBy: {
                createdAt: "asc",
              },

              select: {
                title: true,
                category: true,
                content: true,
                sourceType: true,
              },
            },
          },
        },
      },
    });
  },
};