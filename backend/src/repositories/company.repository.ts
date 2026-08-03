import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const companyRepository = {
  findByEmail(email: string) {
    return prisma.company.findUnique({
      where: {
        email,
      },
    });
  },

  findByVoicePhoneNumber(
  voicePhoneNumber: string,
) {
  return prisma.company.findUnique({
    where: {
      voicePhoneNumber,
    },
  });
},

findAllForAdmin() {
  return prisma.company.findMany({
    orderBy: {
      createdAt: "desc",
    },

    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      voicePhoneNumber: true,
      industry: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,

      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          createdAt: true,
        },
      },

      aiConfiguration: {
        select: {
          id: true,
          agentName: true,
          language: true,
          voice: true,
          welcomeMessage: true,
          temperature: true,
        },
      },
    },
  });
},

findById(id: string) {
  return prisma.company.findUnique({
    where: {
      id,
    },

    select: {
      id: true,
      isActive: true,
    },
  });
},

updateStatus(
  id: string,
  isActive: boolean,
) {
  return prisma.company.update({
    where: {
      id,
    },

    data: {
      isActive,
    },

    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      voicePhoneNumber: true,
      industry: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
},

  create(data: Prisma.CompanyCreateInput) {
    return prisma.company.create({
      data,

      // On choisit explicitement ce qui peut être renvoyé.
      // Le passwordHash n’est jamais exposé dans la réponse HTTP.
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        industry: true,
        isActive: true,
        createdAt: true,
        voicePhoneNumber: true,
        updatedAt: true,

        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            createdAt: true,
          },
        },

        aiConfiguration: {
          select: {
            id: true,
            language: true,
            voice: true,
            agentName: true,
            welcomeMessage: true,
            temperature: true,
          },
        },
      },
    });
  },
};