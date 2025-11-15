import express from "express";
import { requireLogin } from "../middleware/auth.js";
import * as readController from "../controllers/readController.js";

const router = express.Router();

router.get("/read", requireLogin, readController.getReadPage);
router.post("/read", requireLogin, readController.postReadPage);

export default router;