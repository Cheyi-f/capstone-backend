
import type { RequestHandler } from "express";
import { z } from "zod";

export function validateBody(schema: z.ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        details: z.treeifyError(result.error),
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
