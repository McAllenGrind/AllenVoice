import { Router } from "express";
import { createCompany } from "../controllers/company.controller.js";

const companyRouter = Router();

companyRouter.post("/", createCompany);

export default companyRouter;