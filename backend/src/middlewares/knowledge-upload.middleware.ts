import type {
  NextFunction,
  Request,
  Response,
} from "express";

import multer from "multer";

import { AppError } from "../utils/app-error.js";

export const MAX_KNOWLEDGE_FILE_SIZE_BYTES =
  15 * 1024 * 1024;

const knowledgeUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_KNOWLEDGE_FILE_SIZE_BYTES,

    // Un seul fichier par requête.
    files: 1,

    // title, category et audience.
    fields: 3,

    // Un fichier + trois champs texte.
    parts: 5,

    fieldNameSize: 100,
    fieldSize: 20_000,
    headerPairs: 100,
  },
});

const receiveSingleFile =
  knowledgeUpload.single("file");

export function receiveKnowledgeFile(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  receiveSingleFile(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      switch (error.code) {
        case "LIMIT_FILE_SIZE":
          next(
            new AppError(
              413,
              "Le fichier dépasse la taille maximale de 15 Mo.",
            ),
          );
          return;

        case "LIMIT_FILE_COUNT":
        case "LIMIT_UNEXPECTED_FILE":
          next(
            new AppError(
              400,
              "Un seul fichier doit être envoyé dans le champ « file ».",
            ),
          );
          return;

        case "LIMIT_FIELD_COUNT":
        case "LIMIT_PART_COUNT":
          next(
            new AppError(
              400,
              "La requête contient trop de champs.",
            ),
          );
          return;

        case "LIMIT_FIELD_KEY":
        case "LIMIT_FIELD_VALUE":
          next(
            new AppError(
              400,
              "Un des champs du formulaire est trop long.",
            ),
          );
          return;

        default:
          next(
            new AppError(
              400,
              "Le fichier n’a pas pu être reçu.",
            ),
          );
          return;
      }
    }

    next(error);
  });
}