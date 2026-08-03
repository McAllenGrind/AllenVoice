import { prisma } from "../lib/prisma.js";

export const aiRepository = {
  getCompanyContext(
    companyId: string,
  ) {
    return prisma.company.findUnique({
      where: {
        id: companyId,
      },

      select: {
        id: true,
        name: true,
        timeZone: true,
        isActive: true,

        aiConfiguration: {
          select: {
            agentName: true,
            language: true,
            systemPrompt: true,
          },
        },
      },
    });
  },
};