import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { accountService } from "../services/account.service.js";

interface AuthData {
  userId: string;
  companyId: string;
}

export async function updateAccountProfile(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const auth =
      res.locals.auth as AuthData;

    const user =
      await accountService.updateProfile(
        auth.userId,
        req.body,
      );

    res.status(200).json({
      data: user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAccountPassword(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const auth =
      res.locals.auth as AuthData;

    const result =
      await accountService.updatePassword(
        auth.userId,
        req.body,
      );

    res.status(200).json({
      data: result,
    });
  } catch (error) {
    next(error);
  }
}