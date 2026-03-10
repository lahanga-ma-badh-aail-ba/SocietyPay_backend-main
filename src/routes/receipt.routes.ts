import { Router } from "express";
import { 
  generateReceipt, 
  getMyReceipts, 
  getReceiptById,
  downloadReceiptPDF,
  generateMissingReceipts // Add this
} from "../controllers/receipt.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/roleCheck.middleware";

const router = Router();

// Generate receipts for all PAID payments without receipts (Admin only)
router.post("/generate-missing", authMiddleware, requireRole("ADMIN"), generateMissingReceipts);

// Generate receipt manually for specific payment
router.post("/:paymentId", authMiddleware, generateReceipt);

// Get all receipts for logged-in user
router.get("/my", authMiddleware, getMyReceipts);

// Get specific receipt details
router.get("/:id", authMiddleware, getReceiptById);

// Download receipt PDF
router.get("/:id/download", authMiddleware, downloadReceiptPDF);

export default router;