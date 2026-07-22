import { Router } from "express";

import {
  askAI,
  compareAIProviders,
} from "../controllers/ai.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

const aiRouter = Router();

aiRouter.use(authenticate);

aiRouter.post("/ask", askAI);
aiRouter.post("/compare", compareAIProviders);

export default aiRouter;