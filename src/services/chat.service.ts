
import { messageRepository } from "../repositories/message.repository.js";
import { searchDocumentChunks } from "../repositories/retrieval.repository.js";
import { generateAnswer } from "./llm.service.js";

export interface SendMessageInput {
  userId: string;
  question: string;
  conversationId?: string;
}

export async function sendMessage(input: SendMessageInput) {
  const question = input.question.trim();

  let conversation;

  if (input.conversationId) {
    conversation = await messageRepository.findConversationForUser(
      input.conversationId,
      input.userId,
    );

    if (!conversation) {
      throw new Error("CONVERSATION_NOT_FOUND");
    }
  } else {
    conversation = await messageRepository.createConversation(
      input.userId,
      question.slice(0, 80) || "New conversation",
    );
  }

  const userMessage = await messageRepository.createMessage({
    conversationId: conversation.id,
    role: "USER",
    content: question,
  });

  const chunks = await searchDocumentChunks(input.userId, question);

  const citations = chunks.map((chunk) => ({
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    originalName: chunk.originalName,
    pageNumber: chunk.pageNumber,
    chunkIndex: chunk.chunkIndex,
  }));

  const answer = await generateAnswer(question, chunks);

  const assistantMessage = await messageRepository.createMessage({
    conversationId: conversation.id,
    role: "ASSISTANT",
    content: answer,
    citations,
  });

  return {
    conversationId: conversation.id,
    userMessage,
    assistantMessage,
    citations,
  };
}
