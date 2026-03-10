import { Response } from "express";
import prisma from "../config/databases";
import { AuthRequest } from "../middleware/auth.middleware";
import { v4 as uuid } from "uuid";

const UPI_CONFIG = {
  upiId: process.env.UPI_ID || "society@paytm",
  receiverName: process.env.UPI_RECEIVER_NAME || "ABC Housing Society",
};

export const getUPIConfig = async (req: AuthRequest, res: Response) => {
  res.json(UPI_CONFIG);
};

/**
 * Initiate Payment (creates or updates PENDING payment)
 * FIXED: Now properly handles existing PENDING payments
 */
export const initiatePayment = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year, img, paymentMode } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { flat: true },
    });

    if (!user?.flat) {
      return res.status(400).json({ message: "No flat assigned" });
    }

    const maintenanceMonth = await prisma.maintenanceMonth.findUnique({
      where: { month_year: { month, year } },
    });

    if (!maintenanceMonth) {
      return res.status(404).json({
        message: "Maintenance month not initialized. Contact admin.",
      });
    }

    // Check for existing PAID payment
    const existingPaidPayment = await prisma.payment.findFirst({
      where: {
        flatId: user.flat.id,
        maintenanceMonthId: maintenanceMonth.id,
        status: "PAID",
      },
    });

    if (existingPaidPayment) {
      return res.status(400).json({ message: "Already paid for this month" });
    }

    // Check for ANY existing payment (PENDING or FAILED)
    const existingPayment = await prisma.payment.findUnique({
      where: {
        flatId_maintenanceMonthId: {
          flatId: user.flat.id,
          maintenanceMonthId: maintenanceMonth.id,
        },
      },
    });

    const transactionId = uuid();
    let payment;

    if (existingPayment) {
      // Update existing payment
      payment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          transactionId,
          paymentMode: (paymentMode || "UPI") as any,
          img: img || existingPayment.img,
          status: "PENDING", // Reset to PENDING
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new payment
      payment = await prisma.payment.create({
        data: {
          amount: user.flat.monthlyMaintenance,
          status: "PENDING",
          paymentMode: (paymentMode || "UPI") as any,
          transactionId,
          img: img || null,
          flat: { connect: { id: user.flat.id } },
          maintenanceMonth: { connect: { id: maintenanceMonth.id } },
        },
      });
    }

    res.status(201).json({ payment, upiConfig: UPI_CONFIG });
  } catch (error: any) {
    console.error("Initiate payment error:", error);
    res.status(500).json({ 
      message: "Failed to initiate payment",
      error: error.message 
    });
  }
};

/**
 * User submits UPI reference (still PENDING)
 */
export const confirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId, upiTransactionId, img } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { flat: { include: { user: true } } },
    });

    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (payment.flat.user?.id !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });
    if (payment.status === "PAID")
      return res.status(400).json({ message: "Payment already confirmed" });

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        upiTransactionId: upiTransactionId || undefined,
        img: img || payment.img,
        updatedAt: new Date(),
      },
    });

    res.json(updatedPayment);
  } catch (error) {
    console.error("Confirm payment error:", error);
    res.status(500).json({ message: "Failed to confirm payment" });
  }
};

/**
 * Admin confirms payment and generates receipt
 */
export const adminConfirmPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.body;
    if (req.user.role !== "ADMIN")
      return res.status(403).json({ message: "Admin access required" });

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { flat: true, maintenanceMonth: true },
    });

    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (payment.status === "PAID")
      return res.status(400).json({ message: "Payment already confirmed" });

    // Update payment to PAID
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "PAID",
        paidAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Generate receipt automatically
    try {
      const receiptNumber = `RCT-${Date.now()}-${payment.id.slice(0, 8)}`;
      
      await prisma.receipt.create({
        data: {
          paymentId: payment.id,
          receiptNumber,
          emailSent: false,
        },
      });

      console.log(`✅ Auto-generated receipt ${receiptNumber} for payment ${payment.id}`);
    } catch (receiptError) {
      // Log error but don't fail the payment confirmation
      console.error("Failed to auto-generate receipt:", receiptError);
    }

    res.json(updatedPayment);
  } catch (error) {
    console.error("Admin confirm payment error:", error);
    res.status(500).json({ message: "Failed to confirm payment" });
  }
};

/**
 * Get all payments (admin)
 */
export const getAllPayments = async (req: AuthRequest, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      include: { 
        // flat: true,
        flat: {
          include: {
            user: true  // ✅ Add this to include the user/tenant data
          }
        },
        maintenanceMonth: true, 
        receipt: true },
      orderBy: [
        { maintenanceMonth: { year: "desc" } },
        { maintenanceMonth: { month: "desc" } },
      ],
    });
    res.json(payments);
  } catch (error) {
    console.error("Get all payments error:", error);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
};

/**
 * Verify payment
 */
export const verifyPayment = async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId } = req.params;
    const payment = await prisma.payment.findFirst({
      where: { transactionId },
      include: { flat: { include: { user: true } } },
    });
    if (!payment) return res.status(404).json({ message: "Payment not found" });
    if (payment.flat.user?.id !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });
    res.json({ status: payment.status, payment });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({ message: "Failed to verify payment" });
  }
};

/**
 * My payments
 */
export const getMyPayments = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const payments = await prisma.payment.findMany({
      where: { flatId: user?.flatId || undefined },
      include: { maintenanceMonth: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(payments);
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
};