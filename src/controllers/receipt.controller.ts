import { Response } from "express";
import prisma from "../config/databases";
import { AuthRequest } from "../middleware/auth.middleware";

export const generateReceipt = async (req: AuthRequest, res: Response) => {
  const { paymentId } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    return res.status(404).json({ message: "Payment not found" });
  }

  const receipt = await prisma.receipt.create({
    data: {
      paymentId,
      receiptNumber: `RCT-${Date.now()}`,
      pdfData: Buffer.from("Mock PDF Content"),
      emailSent: false,
    },
  });

  res.status(201).json(receipt);
};
