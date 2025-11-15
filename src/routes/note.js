import express from "express";
import { requireLogin } from "../middleware/auth.js";
import * as noteController from "../controllers/noteController.js";

const router = express.Router();

router.post("/newNote/:id", requireLogin, noteController.addNote);
router.post("/book/:bookId/deleteNote/:noteId", requireLogin, noteController.deleteNote);

export default router;