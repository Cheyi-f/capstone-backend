
import type { RequestHandler } from "express";
import { z } from "zod";
import { sendMessage } from "../services/chat.service.js";

import { messageRepository } from "../repositories/message.repository.js";


const sendMessageSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Question cannot be empty.")
    .max(4000, "Question cannot exceed 4000 characters."),
  conversationId: z.string().uuid().optional(),
});

export const sendChatMessage: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    const parsed = sendMessageSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid request body.",
        details: z.treeifyError(parsed.error),
      });
      return;
    }

    if (!req.auth) {
      res.status(401).json({
        error: "Authentication required.",
      });
      return;
    }

    const result = await sendMessage({
      userId: req.auth.userId,
      question: parsed.data.question,
      ...(parsed.data.conversationId
        ? { conversationId: parsed.data.conversationId }
        : {}),
    });

    res.status(201).json(result);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "CONVERSATION_NOT_FOUND"
    ) {
      res.status(404).json({
        error: "Conversation not found.",
      });
      return;
    }

    next(error);
  }
};


export const getChatHistory: RequestHandler = async (
  req,
  res,
  next,
) => {
  try {
    if (!req.auth) {
      res.status(401).json({
        error: "Authentication required.",
      });
      return;
    }

    const parsedId = z.string().uuid().safeParse(req.params.conversationId);

    if (!parsedId.success) {
      res.status(400).json({
        error: "A valid conversation ID is required.",
      });
      return;
    }

    const conversation = await messageRepository.findConversationForUser(
      parsedId.data,
      req.auth.userId,
    );

    if (!conversation) {
      res.status(404).json({
        error: "Conversation not found.",
      });
      return;
    }

    const messages = await messageRepository.listMessages(conversation.id);

    res.status(200).json({
      conversation,
      messages,
    });
  } catch (error) {
    next(error);
  }
};
