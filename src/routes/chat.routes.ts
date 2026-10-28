
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getChatHistory,
  sendChatMessage,
} from "../controllers/chat.controller.js";

const router = Router();

router.use(authenticate);
router.get("/:conversationId/messages", getChatHistory);
router.post("/", sendChatMessage);

export default router;
