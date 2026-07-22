import { Router } from "express";

import {
  askAI,
  compareAIProviders,
  getAIEvaluationStatistics,
  listAIEvaluations,
} from "../controllers/ai.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

const aiRouter = Router();

aiRouter.use(authenticate);

aiRouter.post("/ask", askAI);
aiRouter.post("/compare", compareAIProviders);

aiRouter.get(
  "/evaluations/stats",
  getAIEvaluationStatistics,
);

aiRouter.get(
  "/evaluations",
  listAIEvaluations,
);

export default aiRouter;