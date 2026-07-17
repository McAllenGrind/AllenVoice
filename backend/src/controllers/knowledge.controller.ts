import type {
  NextFunction,
  Request,
  Response,
} from "express";

import type { AccessTokenPayload } from "../models/auth.types.js";

import type {
  CreateKnowledgeDocumentInput,
  UpdateKnowledgeDocumentInput,
} from "../models/knowledge.types.js";

import { knowledgeService } from "../services/knowledge.service.js";

/*
 * Forme des paramètres pour les routes :
 * GET /knowledge/:id
 * PATCH /knowledge/:id
 * DELETE /knowledge/:id
 */
interface KnowledgeDocumentParams {
  id: string;
}

function getAuth(res: Response): AccessTokenPayload {
  return res.locals.auth as AccessTokenPayload;
}

export async function createKnowledgeDocument(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(res);

    const input =
      req.body as CreateKnowledgeDocumentInput;

    const document = await knowledgeService.create(
      auth.companyId,
      input,
    );

    res.status(201).json({
      message: "Connaissance ajoutée avec succès.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
}

export async function listKnowledgeDocuments(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(res);

    const documents = await knowledgeService.list(
      auth.companyId,
    );

    res.status(200).json({
      data: documents,
    });
  } catch (error) {
    next(error);
  }
}

export async function getKnowledgeDocument(
  req: Request<KnowledgeDocumentParams>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(res);

    const document = await knowledgeService.getById(
      req.params.id,
      auth.companyId,
    );

    res.status(200).json({
      data: document,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateKnowledgeDocument(
  req: Request<KnowledgeDocumentParams>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(res);

    const input =
      req.body as UpdateKnowledgeDocumentInput;

    const document = await knowledgeService.update(
      req.params.id,
      auth.companyId,
      input,
    );

    res.status(200).json({
      message: "Connaissance modifiée avec succès.",
      data: document,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteKnowledgeDocument(
  req: Request<KnowledgeDocumentParams>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(res);

    await knowledgeService.delete(
      req.params.id,
      auth.companyId,
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}