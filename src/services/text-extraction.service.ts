
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFParse } from "pdf-parse";

export interface ExtractedPage {
  text: string;
  pageNumber: number | null;
}

export interface DocumentChunkInput {
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
}

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 150;
const MIN_BOUNDARY_DISTANCE = 500;

function validateTextContent(buffer: Buffer): string {
  let text: string;

  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new Error("The uploaded text file is not valid UTF-8.");
  }

  // Reject binary-looking files disguised as text documents.
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text)) {
    throw new Error("The uploaded file contains invalid text characters.");
  }

  return text.replace(/\r\n?/g, "\n").trim();
}

async function extractPdf(filePath: string): Promise<ExtractedPage[]> {
  const buffer = await readFile(filePath);

  // A filename ending in .pdf does not make its contents a PDF.
  if (buffer.length < 5 || buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("The uploaded PDF file has an invalid file signature.");
  }

  const parser = new PDFParse({
    data: new Uint8Array(buffer),
  });

  try {
    const result = await parser.getText();

    return result.pages.map((page) => ({
      text: page.text.trim(),
      pageNumber: page.num,
    }));
  } finally {
    await parser.destroy();
  }
}

export async function extractDocumentText(
  filePath: string,
): Promise<ExtractedPage[]> {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".pdf") {
    return extractPdf(filePath);
  }

  if (extension === ".txt" || extension === ".md") {
    const buffer = await readFile(filePath);
    const text = validateTextContent(buffer);

    if (!text) {
      throw new Error("The uploaded document contains no readable text.");
    }

    return [{ text, pageNumber: null }];
  }

  throw new Error("Unsupported document format.");
}

function findChunkEnd(text: string, start: number): number {
  const proposedEnd = Math.min(start + CHUNK_SIZE, text.length);

  if (proposedEnd === text.length) {
    return proposedEnd;
  }

  const newline = text.lastIndexOf("\n", proposedEnd);
  const space = text.lastIndexOf(" ", proposedEnd);
  const boundary = Math.max(newline, space);

  if (boundary > start + MIN_BOUNDARY_DISTANCE) {
    return boundary;
  }

  return proposedEnd;
}

export function chunkExtractedPages(
  pages: ExtractedPage[],
): DocumentChunkInput[] {
  const chunks: DocumentChunkInput[] = [];

  for (const page of pages) {
    const text = page.text.trim();

    if (!text) {
      continue;
    }

    let start = 0;

    while (start < text.length) {
      const end = findChunkEnd(text, start);
      const content = text.slice(start, end).trim();

      if (content) {
        chunks.push({
          content,
          chunkIndex: chunks.length,
          pageNumber: page.pageNumber,
        });
      }

      if (end >= text.length) {
        break;
      }

      // Overlap gives later retrieval results some surrounding context.
      const nextStart = Math.max(start + 1, end - CHUNK_OVERLAP);
      start = nextStart;
    }
  }

  return chunks;
}
