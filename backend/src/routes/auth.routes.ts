import { Router } from "express";
import {
  getCurrentUser,
  login,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const authRouter = Router();

authRouter.post("/login", login);
authRouter.get("/me", authenticate, getCurrentUser);

export default authRouter;