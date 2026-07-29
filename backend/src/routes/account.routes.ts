import { Router } from "express";

import {
  updateAccountPassword,
  updateAccountProfile,
} from "../controllers/account.controller.js";

import { authenticate } from "../middlewares/auth.middleware.js";

export const accountRouter = Router();

accountRouter.use(authenticate);

accountRouter.patch(
  "/profile",
  updateAccountProfile,
);

accountRouter.patch(
  "/password",
  updateAccountPassword,
);