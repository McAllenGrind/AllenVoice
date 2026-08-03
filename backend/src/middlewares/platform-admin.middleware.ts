import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { prisma } from "../lib/prisma.js";

import type {
  AccessTokenPayload,
} from "../models/auth.types.js";

export async function requirePlatformAdmin(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth =
      res.locals.auth as
        | AccessTokenPayload
        | undefined;

    if (!auth) {
      res.status(401).json({
        error:
          "Authentification requise.",
      });

      return;
    }

    const user =
      await prisma.user.findUnique({
        where: {
          id: auth.userId,
        },

        select: {
          isPlatformAdmin: true,
        },
      });

    if (!user) {
      res.status(401).json({
        error:
          "Utilisateur introuvable.",
      });

      return;
    }

    if (!user.isPlatformAdmin) {
      res.status(403).json({
        error:
          "Accès réservé aux administrateurs AllenVoice.",
      });

      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}