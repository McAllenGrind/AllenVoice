import type { NextFunction, Request, Response } from "express";
import type { CreateCompanyInput } from "../models/company.types.js";
import { companyService } from "../services/company.service.js";

export async function createCompany(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as CreateCompanyInput;

    const company = await companyService.create(input);

    res.status(201).json({
      message: "Entreprise créée avec succès.",
      data: company,
    });
  } catch (error) {
    next(error);
  }
}