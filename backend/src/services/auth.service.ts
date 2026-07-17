import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authConfig } from "../config/auth.js";
import type {
  AccessTokenPayload,
  LoginInput,
} from "../models/auth.types.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";

export const authService = {
  async login(input: LoginInput) {
    const email = input.email?.trim().toLowerCase();
    const password = input.password;

    if (!email || !password) {
      throw new AppError(
        400,
        "L’adresse email et le mot de passe sont obligatoires.",
      );
    }

    const user = await userRepository.findByEmail(email);

    // Même message pour un email inconnu ou un mauvais mot de passe.
    // Cela évite de révéler si un compte existe.
    if (!user) {
      throw new AppError(
        401,
        "Adresse email ou mot de passe incorrect.",
      );
    }

    const passwordIsValid = await bcrypt.compare(
      password,
      user.passwordHash,
    );

    if (!passwordIsValid) {
      throw new AppError(
        401,
        "Adresse email ou mot de passe incorrect.",
      );
    }

    if (!user.company.isActive) {
      throw new AppError(
        403,
        "Le compte de cette entreprise est désactivé.",
      );
    }

    const payload: AccessTokenPayload = {
      userId: user.id,
      companyId: user.company.id,
    };

    const accessToken = jwt.sign(
      payload,
      authConfig.jwtSecret,
      {
        subject: user.id,
        expiresIn: authConfig.jwtExpiresInSeconds,
      },
    );

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: authConfig.jwtExpiresInSeconds,

      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },

      company: user.company,
    };
  },

  async getCurrentUser(userId: string) {
    const user = await userRepository.findPublicById(userId);

    if (!user) {
      throw new AppError(
        404,
        "Utilisateur introuvable.",
      );
    }

    return user;
  },
};