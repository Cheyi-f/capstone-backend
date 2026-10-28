
import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { uploadDocument as receiveUpload } from "../middleware/upload.js";
import {
  deleteDocument,
  listDocuments,
  uploadDocument,
} from "../controllers/document.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", receiveUpload, uploadDocument);
router.get("/", listDocuments);
router.delete("/:id", deleteDocument);

export default router;
