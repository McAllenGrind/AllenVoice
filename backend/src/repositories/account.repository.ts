import { prisma } from "../lib/prisma.js";

export interface UpdateAccountProfileData {
  fullName?: string;
  email?: string;
}

export const accountRepository = {
  findUserById(userId: string) {
    return prisma.user.findUnique({
      where: {
        id: userId,
      },
    });
  },

  findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: {
        email,
      },
    });
  },

  updateProfile(
    userId: string,
    data: UpdateAccountProfileData,
  ) {
    return prisma.user.update({
      where: {
        id: userId,
      },

      data,

      select: {
        id: true,
        fullName: true,
        email: true,
        companyId: true,
      },
    });
  },

  updatePassword(
    userId: string,
    passwordHash: string,
  ) {
    return prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        passwordHash,
      },

      select: {
        id: true,
      },
    });
  },
};