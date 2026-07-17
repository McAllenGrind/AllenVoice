import type {
  NextFunction,
  Request,
  Response,
} from "express";
import type {
  AccessTokenPayload,
  LoginInput,
} from "../models/auth.types.js";
import { authService } from "../services/auth.service.js";

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as LoginInput;
    const result = await authService.login(input);

    res.status(200).json({
      message: "Connexion réussie.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = res.locals.auth as AccessTokenPayload;

    const user = await authService.getCurrentUser(
      auth.userId,
    );

    res.status(200).json({
      data: user,
    });
  } catch (error) {
    next(error);
  }
}