import express from "express";
import { requireLogin } from "../middleware/auth.js";
import * as bookController from "../controllers/bookController.js";

const router = express.Router();

router.get("/", requireLogin, bookController.getDashboard);
router.get("/book/:id", requireLogin, bookController.getBookById);
router.get("/search", requireLogin, bookController.searchBook);
router.post("/addBook", requireLogin, bookController.addBook);
router.post("/deleteBook/:bookId", requireLogin, bookController.deleteBook);

export default router;