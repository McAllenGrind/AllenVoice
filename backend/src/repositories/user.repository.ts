import { prisma } from "../lib/prisma.js";

export const userRepository = {
  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
    });
  },

  findPublicById(id: string) {
    return prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
        updatedAt: true,

        company: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            industry: true,
            isActive: true,
          },
        },
      },
    });
  },
};