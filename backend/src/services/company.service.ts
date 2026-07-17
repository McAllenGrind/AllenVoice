import type { Prisma } from "@prisma/client";
import type { CreateCompanyInput } from "../models/company.types.js";
import { companyRepository } from "../repositories/company.repository.js";
import { AppError } from "../utils/app-error.js";

export const companyService = {
  async create(input: CreateCompanyInput) {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const phoneNumber = input.phoneNumber?.trim();
    const industry = input.industry?.trim();

    if (!name || !email || !phoneNumber) {
      throw new AppError(
        400,
        "Le nom, l’adresse email et le numéro de téléphone sont obligatoires.",
      );
    }

    const existingCompany = await companyRepository.findByEmail(email);

    if (existingCompany) {
      throw new AppError(
        409,
        "Une entreprise utilise déjà cette adresse email.",
      );
    }

    const companyData: Prisma.CompanyCreateInput = {
      name,
      email,
      phoneNumber,
      ...(industry ? { industry } : {}),
    };

    return companyRepository.create(companyData);
  },
};