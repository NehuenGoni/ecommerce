import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { BadRequestError } from "../utils/errors.js";

function validate(schema: ZodType, source: "body" | "query") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      next(new BadRequestError(message));
      return;
    }
    req[source] = result.data;
    next();
  };
}

export function validateBody(schema: ZodType) {
  return validate(schema, "body");
}

export function validateQuery(schema: ZodType) {
  return validate(schema, "query");
}
