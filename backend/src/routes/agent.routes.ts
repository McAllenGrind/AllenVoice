import { Router } from "express";

import {
  getAgentConfiguration,
  updateAgentConfiguration,
} from "../controllers/agent.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

export const agentRouter = Router();

agentRouter.use(authenticate);

agentRouter.get(
  "/config",
  getAgentConfiguration,
);

agentRouter.patch(
  "/config",
  updateAgentConfiguration,
);