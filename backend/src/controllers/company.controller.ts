import type {
  NextFunction,
  Request,
  Response,
} from "express";

import type {
  CreateCompanyInput,
} from "../models/company.types.js";

import {
  companyService,
} from "../services/company.service.js";

export async function createCompany(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input =
      req.body as CreateCompanyInput;

    const company =
      await companyService.create(input);

    res.status(201).json({
      message:
        "Entreprise créée avec succès.",
      data: company,
    });
  } catch (error) {
    next(error);
  }
}

export async function listCompanies(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const companies =
      await companyService.listForAdmin();

    res.status(200).json({
      data: companies,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCompanyStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const companyIdParam =
      req.params.companyId;

    const companyId =
      Array.isArray(companyIdParam)
        ? companyIdParam[0]
        : companyIdParam;

    const company =
      await companyService.updateStatus(
        companyId,
        req.body?.isActive,
      );

    res.status(200).json({
      message: company.isActive
        ? "Entreprise activée."
        : "Entreprise désactivée.",

      data: company,
    });
  } catch (error) {
    next(error);
  }
}