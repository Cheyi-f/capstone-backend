
import { prisma } from "../lib/prisma.js";

export const documentRepository = {
  create(data: {
    userId: string;
    title: string;
    originalName: string;
    mimeType: string;
    fileSize: number;
    storagePath: string;
  }) {
    return prisma.document.create({
      data: {
        userId: data.userId,
        title: data.title,
        originalName: data.originalName,
        mimeType: data.mimeType,
        fileSize: BigInt(data.fileSize),
        storagePath: data.storagePath,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        status: true,
        createdAt: true,
      },
    });
  },

  findByIdForUser(id: string, userId: string) {
    return prisma.document.findFirst({
      where: {
        id,
        userId,
      },
    });
  },

  listByUser(userId: string) {
    return prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        originalName: true,
        mimeType: true,
        fileSize: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  updateStatus(id: string, status: "PENDING" | "PROCESSING" | "READY" | "FAILED") {
    return prisma.document.update({
      where: { id },
      data: { status },
    });
  },

  async replaceChunks(
    documentId: string,
    chunks: Array<{
      content: string;
      chunkIndex: number;
      pageNumber: number | null;
    }>,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.documentChunk.deleteMany({
        where: { documentId },
      });

      if (chunks.length === 0) {
        return [];
      }

      return tx.documentChunk.createMany({
        data: chunks.map((chunk) => ({
          documentId,
          content: chunk.content,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
        })),
      });
    });
  },


  deleteForUser(id: string, userId: string) {
    return prisma.document.deleteMany({
      where: {
        id,
        userId,
      },
    });
  },
};
