import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { AppError } from "../utils/app-error.js";

export function errorMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof Error) {
    console.error("ERREUR BACKEND :", error.name);
    console.error("MESSAGE :", error.message);
    console.error(error.stack);
  } else {
    console.error("ERREUR BACKEND :", error);
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: error.message,
    });

    return;
  }

  res.status(500).json({
    error: "Une erreur interne est survenue.",
  });
}