
import { prisma } from "../lib/prisma.js";

type MessageCitation = {
  documentId: string;
  documentTitle: string;
  originalName: string;
  pageNumber: number | null;
  chunkIndex: number;
};

export const messageRepository = {
  createConversation(userId: string, title: string) {
    return prisma.conversation.create({
      data: {
        userId,
        title: title.slice(0, 255),
      },
      select: {
        id: true,
        userId: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  findConversationForUser(conversationId: string, userId: string) {
    return prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      select: {
        id: true,
        userId: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async createMessage(data: {
    conversationId: string;
    role: "USER" | "ASSISTANT";
    content: string;
    citations?: MessageCitation[];
  }) {
    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        ...(data.citations ? { citations: data.citations } : {}),
      },
      select: {
        id: true,
        conversationId: true,
        role: true,
        content: true,
        citations: true,
        createdAt: true,
      },
    });

    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  },

  listMessages(conversationId: string) {
    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        citations: true,
        createdAt: true,
      },
    });
  },
};
