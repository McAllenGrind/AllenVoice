import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_AI_CONFIGURATION } from "../config/ai-defaults.js";
import type { CreateCompanyInput } from "../models/company.types.js";
import { companyRepository } from "../repositories/company.repository.js";
import { AppError } from "../utils/app-error.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const companyService = {
  async create(input: CreateCompanyInput) {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const phoneNumber = input.phoneNumber?.trim();
    const industry = input.industry?.trim();
    const ownerFullName = input.ownerFullName?.trim();
    const password = input.password;

    if (!name || !email || !phoneNumber || !ownerFullName || !password) {
      throw new AppError(
        400,
        "Le nom de l’entreprise, l’adresse email, le numéro de téléphone, le nom du propriétaire et le mot de passe sont obligatoires.",
      );
    }

    if (!EMAIL_PATTERN.test(email)) {
      throw new AppError(400, "L’adresse email est invalide.");
    }

    if (password.length < 8) {
      throw new AppError(
        400,
        "Le mot de passe doit contenir au moins 8 caractères.",
      );
    }

    // bcrypt traite au maximum 72 octets de mot de passe.
    if (Buffer.byteLength(password, "utf8") > 72) {
      throw new AppError(
        400,
        "Le mot de passe est trop long.",
      );
    }

    const existingCompany = await companyRepository.findByEmail(email);

    if (existingCompany) {
      throw new AppError(
        409,
        "Une entreprise utilise déjà cette adresse email.",
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const companyData: Prisma.CompanyCreateInput = {
      name,
      email,
      phoneNumber,

      ...(industry ? { industry } : {}),

      user: {
        create: {
          fullName: ownerFullName,
          email,
          passwordHash,
        },
      },

      aiConfiguration: {
        create: DEFAULT_AI_CONFIGURATION,
      },

      knowledgeBase: {
        create: {},
    },
    };

    return companyRepository.create(companyData);
  },
};