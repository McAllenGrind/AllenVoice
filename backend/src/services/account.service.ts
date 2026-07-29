import bcrypt from "bcryptjs";

import { AppError } from "../utils/app-error.js";

import {
  accountRepository,
  type UpdateAccountProfileData,
} from "../repositories/account.repository.js";

export interface UpdateAccountProfileInput {
  fullName?: unknown;
  email?: unknown;
}

export interface UpdatePasswordInput {
  currentPassword?: unknown;
  newPassword?: unknown;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export const accountService = {
  async updateProfile(
    userId: string,
    input: UpdateAccountProfileInput,
  ) {
    const data: UpdateAccountProfileData = {};

    if (input.fullName !== undefined) {
      if (typeof input.fullName !== "string") {
        throw new AppError(
          400,
          "Le nom doit être une chaîne de caractères.",
        );
      }

      const fullName = input.fullName.trim();

      if (fullName.length < 2) {
        throw new AppError(
          400,
          "Le nom doit contenir au moins 2 caractères.",
        );
      }

      data.fullName = fullName;
    }

    if (input.email !== undefined) {
      if (typeof input.email !== "string") {
        throw new AppError(
          400,
          "L’adresse courriel est invalide.",
        );
      }

      const email = normalizeEmail(input.email);

      if (!email.includes("@")) {
        throw new AppError(
          400,
          "L’adresse courriel est invalide.",
        );
      }

      const existingUser =
        await accountRepository.findUserByEmail(
          email,
        );

      if (
        existingUser &&
        existingUser.id !== userId
      ) {
        throw new AppError(
          409,
          "Cette adresse courriel est déjà utilisée.",
        );
      }

      data.email = email;
    }

    if (Object.keys(data).length === 0) {
      throw new AppError(
        400,
        "Aucune modification fournie.",
      );
    }

    return accountRepository.updateProfile(
      userId,
      data,
    );
  },

  async updatePassword(
    userId: string,
    input: UpdatePasswordInput,
  ) {
    if (
      typeof input.currentPassword !== "string" ||
      typeof input.newPassword !== "string"
    ) {
      throw new AppError(
        400,
        "Les mots de passe sont requis.",
      );
    }

    const user =
      await accountRepository.findUserById(
        userId,
      );

    if (!user) {
      throw new AppError(
        404,
        "Utilisateur introuvable.",
      );
    }

    const passwordMatches =
      await bcrypt.compare(
        input.currentPassword,
        user.passwordHash,
      );

    if (!passwordMatches) {
      throw new AppError(
        401,
        "Le mot de passe actuel est incorrect.",
      );
    }

    if (input.newPassword.length < 8) {
      throw new AppError(
        400,
        "Le nouveau mot de passe doit contenir au moins 8 caractères.",
      );
    }

    if (
      input.currentPassword ===
      input.newPassword
    ) {
      throw new AppError(
        400,
        "Le nouveau mot de passe doit être différent de l’ancien.",
      );
    }

    const passwordHash =
      await bcrypt.hash(
        input.newPassword,
        12,
      );

    await accountRepository.updatePassword(
      userId,
      passwordHash,
    );

    return {
      message:
        "Mot de passe modifié avec succès.",
    };
  },
};