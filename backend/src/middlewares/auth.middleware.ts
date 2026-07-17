import type {
  NextFunction,
  Request,
  Response,
} from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { authConfig } from "../config/auth.js";
import type { AccessTokenPayload } from "../models/auth.types.js";

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authorizationHeader = req.header("authorization");

  if (!authorizationHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Jeton d’authentification manquant.",
    });

    return;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();

  try {
    const decodedToken = jwt.verify(
      token,
      authConfig.jwtSecret,
    );

    if (typeof decodedToken === "string") {
      res.status(401).json({
        error: "Jeton d’authentification invalide.",
      });

      return;
    }

    const payload = decodedToken as JwtPayload &
      Partial<AccessTokenPayload>;

    if (
      typeof payload.userId !== "string" ||
      typeof payload.companyId !== "string"
    ) {
      res.status(401).json({
        error: "Contenu du jeton invalide.",
      });

      return;
    }

    res.locals.auth = {
      userId: payload.userId,
      companyId: payload.companyId,
    } satisfies AccessTokenPayload;

    next();
  } catch {
    res.status(401).json({
      error: "Jeton invalide ou expiré.",
    });
  }
}