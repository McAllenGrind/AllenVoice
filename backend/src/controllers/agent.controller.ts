import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { agentService } from "../services/agent.service.js";

interface AuthData {
  companyId: string;
}

export async function getAgentConfiguration(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const auth =
      res.locals.auth as AuthData;

    const configuration =
      await agentService.getConfiguration(
        auth.companyId,
      );

    res.status(200).json({
      data: configuration,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAgentConfiguration(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const auth =
      res.locals.auth as AuthData;

    const configuration =
      await agentService.updateConfiguration(
        auth.companyId,
        req.body,
      );

    res.status(200).json({
      data: configuration,
    });
  } catch (error) {
    next(error);
  }
}