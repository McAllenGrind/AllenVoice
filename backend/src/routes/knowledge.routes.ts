import { Router } from "express";

import {
  createKnowledgeDocument,
  deleteKnowledgeDocument,
  getKnowledgeDocument,
  listKnowledgeDocuments,
  searchKnowledgeDocuments,
  updateKnowledgeDocument,
  uploadKnowledgeDocument,
} from "../controllers/knowledge.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

import {
  receiveKnowledgeFile,
} from "../middlewares/knowledge-upload.middleware.js";

const knowledgeRouter = Router();

// Toutes les routes suivantes nécessitent un JWT valide.
knowledgeRouter.use(authenticate);

knowledgeRouter.post(
  "/upload",
  receiveKnowledgeFile,
  uploadKnowledgeDocument,
);

knowledgeRouter.post(
  "/search",
  searchKnowledgeDocuments,
);

knowledgeRouter.post(
  "/",
  createKnowledgeDocument,
);

knowledgeRouter.get(
  "/",
  listKnowledgeDocuments,
);

knowledgeRouter.get(
  "/:id",
  getKnowledgeDocument,
);

knowledgeRouter.patch(
  "/:id",
  updateKnowledgeDocument,
);

knowledgeRouter.delete(
  "/:id",
  deleteKnowledgeDocument,
);

export default knowledgeRouter;