import { prisma } from "../lib/prisma.js";

export interface UpdateAgentConfigurationData {
  systemPrompt?: string;
  language?: string;
  voice?: string;
  welcomeMessage?: string;
  temperature?: number;
}

export const agentRepository = {
  findByCompanyId(companyId: string) {
    return prisma.aIConfiguration.findUnique({
      where: {
        companyId,
      },
    });
  },

  update(
    companyId: string,
    data: UpdateAgentConfigurationData,
  ) {
    return prisma.aIConfiguration.update({
      where: {
        companyId,
      },

      data,
    });
  },
};