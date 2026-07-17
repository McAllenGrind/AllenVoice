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

  create(data: Prisma.CompanyCreateInput) {
    return prisma.company.create({
      data,
    });
  },
};