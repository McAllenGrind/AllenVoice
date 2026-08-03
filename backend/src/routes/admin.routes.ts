import { Router } from "express";

import {
  createCompany,
  listCompanies,
  updateCompanyStatus,
} from "../controllers/company.controller.js";

import {
  authenticate,
} from "../middlewares/auth.middleware.js";

import {
  requirePlatformAdmin,
} from "../middlewares/platform-admin.middleware.js";

const adminRouter = Router();

adminRouter.use(
  authenticate,
  requirePlatformAdmin,
);

adminRouter.get(
  "/companies",
  listCompanies,
);

adminRouter.post(
  "/companies",
  createCompany,
);

adminRouter.patch(
  "/companies/:companyId/status",
  updateCompanyStatus,
);

export default adminRouter;