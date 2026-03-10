import { Router } from "express";
import { 
  initiatePayment,
  confirmPayment,
  adminConfirmPayment, // ✅ Add this
  verifyPayment,
  getMyPayments,
  getUPIConfig,
  // handlePaymentWebhook,
  getAllPayments,
} from "../controllers/payment.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/roleCheck.middleware";

const router = Router();

// Get UPI configuration
router.get("/upi-config", authMiddleware, getUPIConfig);

// Initiate payment (creates PENDING payment with image)
router.post("/initiate", authMiddleware, initiatePayment);

// Confirm payment after UPI transaction (user submits screenshot)
router.post("/confirm", authMiddleware, confirmPayment);

// ✅ NEW: Admin confirms payment after reviewing screenshot
router.post("/admin-confirm", authMiddleware, requireRole("ADMIN"), adminConfirmPayment);

// Get all payments (admin only)
router.get("/all", authMiddleware, requireRole("ADMIN"), getAllPayments);

// Verify payment status
router.get("/verify/:transactionId", authMiddleware, verifyPayment);

// Get user's payment history
router.get("/my", authMiddleware, getMyPayments);

export default router;