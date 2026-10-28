
import multer from "multer";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const uploadDirectory = path.resolve(process.cwd(), "uploads");
const maxFileSize = 10 * 1024 * 1024;

const allowedExtensions = new Set([".pdf", ".txt", ".md"]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    mkdir(uploadDirectory, { recursive: true })
      .then(() => callback(null, uploadDirectory))
      .catch((error: Error) => callback(error, uploadDirectory));
  },

  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    callback(null, `${randomUUID()}${extension}`);
  },
});

export const uploadDocument = multer({
  storage,
  limits: {
    fileSize: maxFileSize,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      callback(
        new Error("Unsupported file extension. Upload a PDF, TXT, or Markdown file."),
      );
      return;
    }

    callback(null, true);
  },
}).single("document");
