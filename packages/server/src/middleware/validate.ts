import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { BadRequestError } from "../utils/errors.js";

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      next(new BadRequestError(message));
      return;
    }
    req.body = result.data;
    next();
  };
}
