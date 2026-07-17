import type {
  KnowledgeSourceType,
  Prisma,
} from "@prisma/client";
import type {
  CreateKnowledgeDocumentInput,
  UpdateKnowledgeDocumentInput,
} from "../models/knowledge.types.js";
import { knowledgeRepository } from "../repositories/knowledge.repository.js";
import { AppError } from "../utils/app-error.js";

const ALLOWED_SOURCE_TYPES = new Set([
  "TEXT",
  "FAQ",
  "PDF",
  "WORD",
]);

function parseSourceType(
  value: string | undefined,
): KnowledgeSourceType {
  const sourceType = (value ?? "TEXT").toUpperCase();

  if (!ALLOWED_SOURCE_TYPES.has(sourceType)) {
    throw new AppError(
      400,
      "Le type de source doit être TEXT, FAQ, PDF ou WORD.",
    );
  }

  return sourceType as KnowledgeSourceType;
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
    const sourceType = parseSourceType(input.sourceType);

    if (!title || !content) {
      throw new AppError(
        400,
        "Le titre et le contenu sont obligatoires.",
      );
    }

    const knowledgeBase =
      await knowledgeRepository.getOrCreateBase(companyId);

    const data: Prisma.KnowledgeDocumentCreateInput = {
      title,
      content,
      sourceType,

      ...(category ? { category } : {}),

      knowledgeBase: {
        connect: {
          id: knowledgeBase.id,
        },
      },
    };

    return knowledgeRepository.create(data);
  },

  list(companyId: string) {
    return knowledgeRepository.findAllByCompany(companyId);
  },

  async getById(id: string, companyId: string) {
    return findOwnedDocument(id, companyId);
  },

  async update(
    id: string,
    companyId: string,
    input: UpdateKnowledgeDocumentInput,
  ) {
    await findOwnedDocument(id, companyId);

    const data: Prisma.KnowledgeDocumentUpdateInput = {};

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
      const content = input.content.trim();

      if (!content) {
        throw new AppError(
          400,
          "Le contenu ne peut pas être vide.",
        );
      }

      data.content = content;
    }

    if (input.category !== undefined) {
      data.category = input.category?.trim() || null;
    }

    if (input.sourceType !== undefined) {
      data.sourceType = parseSourceType(
        input.sourceType,
      );
    }

    if (input.isActive !== undefined) {
      data.isActive = input.isActive;
    }

    if (Object.keys(data).length === 0) {
      throw new AppError(
        400,
        "Aucune modification n’a été fournie.",
      );
    }

    return knowledgeRepository.update(id, data);
  },

  async delete(id: string, companyId: string) {
    await findOwnedDocument(id, companyId);
    await knowledgeRepository.delete(id);
  },
};