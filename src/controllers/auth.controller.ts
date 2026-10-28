
import type { RequestHandler } from "express";
import { ZodError, z } from "zod";
import { AuthError, authService } from "../services/auth.service.js";

const registerSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().max(150).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

export const register: RequestHandler = async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register({
  email: input.email,
  password: input.password,
  ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
});

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    if (error instanceof ZodError) {
      res.status(400).json({
        error: "Invalid registration details.",
        details: z.treeifyError(error),
      });
      return;
    }

    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    if (error instanceof ZodError) {
      res.status(400).json({
        error: "Invalid login details.",
        details: z.treeifyError(error),
      });
      return;
    }

    next(error);
  }
};

export const getMe: RequestHandler = (req, res) => {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  res.status(200).json({
    user: {
      id: req.auth.userId,
      email: req.auth.email,
    },
  });
};