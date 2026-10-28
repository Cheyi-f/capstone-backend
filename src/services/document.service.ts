
import { unlink } from "node:fs/promises";
import path from "node:path";

import { documentRepository } from "../repositories/document.repository.js";
import {
  chunkExtractedPages,
  extractDocumentText,
} from "./text-extraction.service.js";

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/plain"],
};

export class DocumentServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "DocumentServiceError";
  }
}

async function removeFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }

    console.error("Failed to remove uploaded file:", error);
  }
}

export const documentService = {
  async createUploadedDocument(
    userId: string,
    file: UploadedFile,
    requestedTitle?: string,
  ) {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowedMimeTypes = ALLOWED_TYPES[extension];

    if (!allowedMimeTypes || !allowedMimeTypes.includes(file.mimetype)) {
      await removeFile(file.path);

      throw new DocumentServiceError(
        "Unsupported file type. Upload a PDF, TXT, or Markdown file.",
        415,
      );
    }

    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      await removeFile(file.path);

      throw new DocumentServiceError(
        "The file must be greater than 0 bytes and no larger than 10 MB.",
        413,
      );
    }

    const title =
      requestedTitle?.trim() ||
      path.parse(file.originalname).name;

    if (title.length === 0 || title.length > 255) {
      await removeFile(file.path);

      throw new DocumentServiceError(
        "The document title must be between 1 and 255 characters.",
        400,
      );
    }

    const storagePath = path
      .relative(process.cwd(), file.path)
      .split(path.sep)
      .join("/");

    let document;

    try {
      document = await documentRepository.create({
        userId,
        title,
        originalName: path.basename(file.originalname),
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath,
      });
    } catch (error) {
      await removeFile(file.path);
      throw error;
    }

    await documentRepository.updateStatus(document.id, "PROCESSING");

    let pages;

    try {
      pages = await extractDocumentText(file.path);
    } catch (error) {
      console.error("Document text extraction failed:", error);

      await documentRepository.updateStatus(document.id, "FAILED");

      throw new DocumentServiceError(
        "Could not extract text. Ensure the file is valid and contains readable text.",
        422,
      );
    }

    const chunks = chunkExtractedPages(pages);

    if (chunks.length === 0) {
      await documentRepository.updateStatus(document.id, "FAILED");

      throw new DocumentServiceError(
        "No readable text was found in the document.",
        422,
      );
    }

    try {
      await documentRepository.replaceChunks(document.id, chunks);

      const readyDocument = await documentRepository.updateStatus(
        document.id,
        "READY",
      );

      return {
        ...readyDocument,
        fileSize: readyDocument.fileSize.toString(),
        chunkCount: chunks.length,
      };
    } catch (error) {
      await documentRepository.updateStatus(document.id, "FAILED");
      throw error;
    }
  },

  async listDocuments(userId: string) {
    const documents = await documentRepository.listByUser(userId);

    return documents.map((document) => ({
      ...document,
      fileSize: document.fileSize.toString(),
    }));
  },
};
