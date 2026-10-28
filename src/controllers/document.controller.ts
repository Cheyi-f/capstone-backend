
import type { RequestHandler } from "express";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { DocumentServiceError, documentService } from "../services/document.service.js";
import { documentRepository } from "../repositories/document.repository.js";

async function removeStoredFile(storagePath: string): Promise<void> {
  const uploadsDirectory = path.resolve(process.cwd(), "uploads");
  const absolutePath = path.resolve(process.cwd(), storagePath);
  const relativePath = path.relative(uploadsDirectory, absolutePath);

  if (
    relativePath === "" ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error("Refusing to delete a file outside the uploads directory.");
  }

  await unlink(absolutePath);
}

export const uploadDocument: RequestHandler = async (req, res, next) => {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  if (!req.file) {
    res.status(400).json({
      error: 'No file received. Send one file in the "document" field.',
    });
    return;
  }

  try {
    const title =
      typeof req.body?.title === "string" ? req.body.title : undefined;

    const document = await documentService.createUploadedDocument(
      req.auth.userId,
      req.file,
      title,
    );

    res.status(201).json({ document });
  } catch (error) {
    next(error);
  }
};

export const listDocuments: RequestHandler = async (req, res, next) => {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const documents = await documentService.listDocuments(req.auth.userId);
    res.status(200).json({ documents });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument: RequestHandler = async (req, res, next) => {
  if (!req.auth) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  const id = req.params.id;

if (typeof id !== "string" || id.trim().length === 0) {
  res.status(400).json({ error: "A valid document ID is required." });
  return;
    }

  try {
    const document = await documentRepository.findByIdForUser(
      id,
      req.auth.userId,
    );

    if (!document) {
      res.status(404).json({ error: "Document not found." });
      return;
    }

    await removeStoredFile(document.storagePath);

    await documentRepository.deleteForUser(id, req.auth.userId);

    res.status(204).send();
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    next(error);
  }
};
