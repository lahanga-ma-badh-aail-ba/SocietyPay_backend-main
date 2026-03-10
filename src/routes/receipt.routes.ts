import { Router } from "express";
import { generateReceipt } from "../controllers/receipt.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/:paymentId", authMiddleware, generateReceipt);

export default router;
