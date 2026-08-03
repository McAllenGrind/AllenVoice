import {
  basename,
  extname,
} from "node:path";

import type {
  KnowledgeAudience,
  KnowledgeSourceType,
  Prisma,
} from "@prisma/client";

import type {
  CreateKnowledgeDocumentInput,
  UpdateKnowledgeDocumentInput,
  UploadKnowledgeDocumentInput,
} from "../models/knowledge.types.js";

import {
  knowledgeRepository,
} from "../repositories/knowledge.repository.js";

import {
  validateKnowledgeFile,
} from "./knowledge-file.service.js";

import {
  analyzeKnowledgeFile,
} from "./document-analysis.service.js";

import { AppError } from "../utils/app-error.js";

import {
  buildKnowledgeIndex,
} from "./knowledge-indexing.service.js";

const ALLOWED_SOURCE_TYPES = new Set([
  "TEXT",
  "FAQ",
  "PDF",
  "WORD",
  "EXCEL",
  "POWERPOINT",
  "CSV",
  "TXT",
  "IMAGE",
]);

const ALLOWED_AUDIENCES = new Set([
  "CUSTOMER",
  "INTERNAL",
]);

function parseSourceType(
  value: string | undefined,
): KnowledgeSourceType {
  const sourceType = (
    value ?? "TEXT"
  ).toUpperCase();

  if (!ALLOWED_SOURCE_TYPES.has(sourceType)) {
    throw new AppError(
      400,
      "Le type de source doit être TEXT, FAQ, PDF, WORD, EXCEL, POWERPOINT, CSV, TXT ou IMAGE.",
    );
  }

  return sourceType as KnowledgeSourceType;
}

function parseAudience(
  value: string | undefined,
): KnowledgeAudience {
  const audience = (
    value ?? "CUSTOMER"
  ).toUpperCase();

  if (!ALLOWED_AUDIENCES.has(audience)) {
    throw new AppError(
      400,
      "L’audience doit être CUSTOMER ou INTERNAL.",
    );
  }

  return audience as KnowledgeAudience;
}

function createTitleFromFileName(
  fileName: string,
): string {
  const extension = extname(fileName);

  return basename(
    fileName,
    extension,
  ).trim();
}

function getErrorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Erreur inconnue pendant l’analyse.";
}

async function findOwnedDocument(
  id: string,
  companyId: string,
) {
  const document =
    await knowledgeRepository.findByIdForCompany(
      id,
      companyId,
    );

  if (!document) {
    throw new AppError(
      404,
      "Document de connaissance introuvable.",
    );
  }

  return document;
}

export const knowledgeService = {
  async create(
    companyId: string,
    input: CreateKnowledgeDocumentInput,
  ) {
    const title = input.title?.trim();
    const content = input.content?.trim();
    const category = input.category?.trim();

    const sourceType =
      parseSourceType(input.sourceType);

    const audience =
      parseAudience(input.audience);

    if (!title || !content) {
      throw new AppError(
        400,
        "Le titre et le contenu sont obligatoires.",
      );
    }

    const knowledgeBase =
      await knowledgeRepository.getOrCreateBase(
        companyId,
      );

    const data: Prisma.KnowledgeDocumentCreateInput = {
      title,
      content,
      sourceType,
      audience,
      status: "READY",

      ...(category
        ? { category }
        : {}),

      knowledgeBase: {
        connect: {
          id: knowledgeBase.id,
        },
      },
    };

    const document =
      await knowledgeRepository.create({
        ...data,
        content: "",
        status: "PROCESSING",
      });

    try {
      const {
        chunks,
        embeddings,
      } = await buildKnowledgeIndex({
        title,
        category,
        content,
      });

      return await knowledgeRepository.completeProcessing(
        document.id,
        {
          content,
          status: "READY",
          failureReason: null,
          processedAt: new Date(),
        },
        chunks,
        embeddings,
      );
    } catch (error) {
      const failureReason =
        error instanceof Error
          ? error.message.slice(0, 1000)
          : "Erreur inconnue pendant l’indexation.";

      await knowledgeRepository.update(
        document.id,
        {
          status: "FAILED",
          failureReason,
          processedAt: new Date(),
        },
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        502,
        "L’indexation de la connaissance a échoué.",
      );
    }
  },

  async upload(
    companyId: string,
    input: UploadKnowledgeDocumentInput,
    uploadedFile: Express.Multer.File | undefined,
  ) {
    const validatedFile =
      await validateKnowledgeFile(
        uploadedFile,
      );

    const title =
      input.title?.trim() ||
      createTitleFromFileName(
        validatedFile.fileName,
      );

    const category =
      input.category?.trim();

    const audience =
      parseAudience(input.audience);

    if (!title) {
      throw new AppError(
        400,
        "Le document doit avoir un titre.",
      );
    }

    const knowledgeBase =
      await knowledgeRepository.getOrCreateBase(
        companyId,
      );

    const document =
      await knowledgeRepository.create({
        title,
        content: "",
        category:
          category || undefined,

        sourceType:
          validatedFile.sourceType,

        audience,
        status: "PROCESSING",
        isActive: true,

        fileName:
          validatedFile.fileName,

        mimeType:
          validatedFile.mimeType,

        fileSize:
          validatedFile.fileSize,

        knowledgeBase: {
          connect: {
            id: knowledgeBase.id,
          },
        },
      });

    try {
      const analysis =
        await analyzeKnowledgeFile(
          validatedFile,
        );

      const {
        chunks,
        embeddings,
      } = await buildKnowledgeIndex({
        title,
        category,
        content: analysis.content,
      });

      if (chunks.length === 0) {
        throw new AppError(
          400,
          "Aucun passage exploitable n’a pu être créé à partir du document.",
        );
      }

      return await knowledgeRepository.completeProcessing(
        document.id,
        {
          content: analysis.content,
          status: "READY",

          extractionMode:
            analysis.extractionMode,

          pageCount:
            analysis.pageCount,

          failureReason: null,
          processedAt: new Date(),
        },
        chunks,
        embeddings,
      );
    } catch (error) {
      const failureReason =
        getErrorMessage(error).slice(
          0,
          1000,
        );

      await knowledgeRepository.update(
        document.id,
        {
          status: "FAILED",
          failureReason,
          processedAt: new Date(),
        },
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        502,
        "L’analyse du document a échoué.",
      );
    }
  },

  list(companyId: string) {
    return knowledgeRepository.findAllByCompany(
      companyId,
    );
  },

  async getById(
    id: string,
    companyId: string,
  ) {
    return findOwnedDocument(
      id,
      companyId,
    );
  },

  async update(
    id: string,
    companyId: string,
    input: UpdateKnowledgeDocumentInput,
  ) {
    const existingDocument =
      await findOwnedDocument(
        id,
        companyId,
      );

    const data: Prisma.KnowledgeDocumentUpdateInput =
      {};

    if (input.title !== undefined) {
      const title = input.title.trim();

      if (!title) {
        throw new AppError(
          400,
          "Le titre ne peut pas être vide.",
        );
      }

      data.title = title;
    }

    if (input.content !== undefined) {
      const content =
        input.content.trim();

      if (!content) {
        throw new AppError(
          400,
          "Le contenu ne peut pas être vide.",
        );
      }

      data.content = content;
    }

    if (input.category !== undefined) {
      data.category =
        input.category?.trim() || null;
    }

    if (input.sourceType !== undefined) {
      data.sourceType =
        parseSourceType(
          input.sourceType,
        );
    }

    if (input.audience !== undefined) {
      data.audience =
        parseAudience(
          input.audience,
        );
    }

    if (input.isActive !== undefined) {
      data.isActive =
        input.isActive;
    }

    if (Object.keys(data).length === 0) {
      throw new AppError(
        400,
        "Aucune modification n’a été fournie.",
      );
    }

    const requiresReindexing =
      input.title !== undefined ||
      input.content !== undefined ||
      input.category !== undefined;

    if (!requiresReindexing) {
      return knowledgeRepository.update(
        id,
        data,
      );
    }

    const nextTitle =
      input.title !== undefined
        ? input.title.trim()
        : existingDocument.title;

    const nextContent =
      input.content !== undefined
        ? input.content.trim()
        : existingDocument.content;

    const nextCategory =
      input.category !== undefined
        ? input.category?.trim() || null
        : existingDocument.category;

    await knowledgeRepository.update(
      id,
      {
        ...data,
        status: "PROCESSING",
        failureReason: null,
      },
    );

    try {
      const {
        chunks,
        embeddings,
      } = await buildKnowledgeIndex({
        title: nextTitle,
        category: nextCategory,
        content: nextContent,
      });

      return await knowledgeRepository.completeProcessing(
        id,
        {
          status: "READY",
          failureReason: null,
          processedAt: new Date(),
        },
        chunks,
        embeddings,
      );
    } catch (error) {
      const failureReason =
        error instanceof Error
          ? error.message.slice(0, 1000)
          : "Erreur inconnue pendant la réindexation.";

      await knowledgeRepository.update(
        id,
        {
          status: "FAILED",
          failureReason,
          processedAt: new Date(),
        },
      );

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        502,
        "La réindexation de la connaissance a échoué.",
      );
    }
  },

  async delete(
    id: string,
    companyId: string,
  ) {
    await findOwnedDocument(
      id,
      companyId,
    );

    await knowledgeRepository.delete(id);
  },
};