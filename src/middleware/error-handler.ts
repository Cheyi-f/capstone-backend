
import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { config } from "../lib/config.js";
import { DocumentServiceError } from "../services/document.service.js";

export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  _next,
) => {
  if (error instanceof multer.MulterError) {
    const statusCode =
      error.code === "LIMIT_FILE_SIZE" ? 413 : 400;

    res.status(statusCode).json({
      error:
        error.code === "LIMIT_FILE_SIZE"
          ? "File exceeds the 10 MB upload limit."
          : `Upload failed: ${error.message}`,
    });
    return;
  }

  if (error instanceof DocumentServiceError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  if (error instanceof Error && error.message.startsWith("Unsupported file extension.")) {
    res.status(415).json({ error: error.message });
    return;
  }

  console.error("Request failed:", error);

  res.status(500).json({
    error: "Internal server error.",
    ...(config.NODE_ENV === "development" && error instanceof Error
      ? { details: error.message }
      : {}),
  });
};
