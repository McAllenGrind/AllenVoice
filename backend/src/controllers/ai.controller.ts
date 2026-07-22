import type {
  NextFunction,
  Request,
  Response,
} from "express";

import type { AccessTokenPayload } from "../models/auth.types.js";
import type { AskAIInput } from "../models/ai.types.js";
import { aiService } from "../services/ai.service.js";
import { aiEvaluationService } from "../services/ai-evaluation.service.js";

function getAuth(res: Response): AccessTokenPayload {
  return res.locals.auth as AccessTokenPayload;
}

export async function askAI(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(res);
    const input = req.body as AskAIInput;

    const result = await aiService.ask(
      auth.companyId,
      input,
    );

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function compareAIProviders(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(res);
    const input = req.body as AskAIInput;

    const result = await aiService.compare(
      auth.companyId,
      input,
    );

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function listAIEvaluations(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(res);

    const evaluations =
      await aiEvaluationService.list(
        auth.companyId,
      );

    res.status(200).json({
      data: evaluations,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAIEvaluationStatistics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const auth = getAuth(res);

    const statistics =
      await aiEvaluationService.getStatistics(
        auth.companyId,
      );

    res.status(200).json({
      data: statistics,
    });
  } catch (error) {
    next(error);
  }
}