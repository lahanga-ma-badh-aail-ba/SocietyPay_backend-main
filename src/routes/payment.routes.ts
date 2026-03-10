import { Router } from "express";
import { 
  initiatePayment,
  confirmPayment,
  verifyPayment,
  getMyPayments,
  getUPIConfig,
  handlePaymentWebhook,
  getAllPayments,
} from "../controllers/payment.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/roleCheck.middleware";


const router = Router();

// Get UPI configuration
router.get("/upi-config", authMiddleware, getUPIConfig);

// Initiate payment (creates PENDING payment)
router.post("/initiate", authMiddleware, initiatePayment);

// Confirm payment after UPI transaction
router.post("/confirm", authMiddleware, confirmPayment);

// Add this route (admin only)
router.get("/all", authMiddleware, requireRole("ADMIN"), getAllPayments);

// Verify payment status
router.get("/verify/:transactionId", authMiddleware, verifyPayment);

// Get user's payment history
router.get("/my", authMiddleware, getMyPayments);

// Webhook for payment gateway callbacks (no auth middleware)
// router.post("/webhook", handlePaymentWebhook);

export default router;