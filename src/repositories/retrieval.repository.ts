import { prisma } from "../lib/prisma.js";

export interface RetrievedChunk {
  id: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  documentId: string;
  documentTitle: string;
  originalName: string;
}

export async function searchDocumentChunks(
  userId: string,
  query: string,
  limit = 5,
): Promise<RetrievedChunk[]> {
  const terms = [
    ...new Set(
      query
        .toLowerCase()
        .match(/[\p{L}\p{N}]+/gu) ?? [],
    ),
  ].filter((term) => term.length > 1);

  if (terms.length === 0) {
    return [];
  }

  const chunks = await prisma.documentChunk.findMany({
    where: {
      document: {
        userId,
        status: "READY",
      },
      OR: terms.map((term) => ({
        content: {
          contains: term,
          mode: "insensitive",
        },
      })),
    },
    select: {
      id: true,
      content: true,
      chunkIndex: true,
      pageNumber: true,
      documentId: true,
      document: {
        select: {
          title: true,
          originalName: true,
        },
      },
    },
    take: 100,
  });

  const ranked = chunks
    .map((chunk) => {
      const content = chunk.content.toLowerCase();

      const score = terms.reduce(
        (total, term) =>
          total + (content.includes(term) ? 1 : 0),
        0,
      );

      return { chunk, score };
    })
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.chunk.chunkIndex - b.chunk.chunkIndex,
    )
    .slice(0, Math.max(1, Math.min(limit, 10)));

  return ranked.map(({ chunk }) => ({
    id: chunk.id,
    content: chunk.content,
    chunkIndex: chunk.chunkIndex,
    pageNumber: chunk.pageNumber,
    documentId: chunk.documentId,
    documentTitle: chunk.document.title,
    originalName: chunk.document.originalName,
  }));
}
