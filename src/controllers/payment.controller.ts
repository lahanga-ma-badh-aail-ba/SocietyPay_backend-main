import { Response } from "express";
import prisma from "../config/databases";
import { AuthRequest } from "../middleware/auth.middleware";
import { v4 as uuid } from "uuid";

/**
 * UPI Configuration
 * (Keep these in .env in production)
 */
const UPI_CONFIG = {
  upiId: process.env.UPI_ID || "society@paytm",
  receiverName:
    process.env.UPI_RECEIVER_NAME || "ABC Housing Society",
};

/**
 * Get UPI configuration for frontend
 */
export const getUPIConfig = async (req: AuthRequest, res: Response) => {
  res.json({
    upiId: UPI_CONFIG.upiId,
    receiverName: UPI_CONFIG.receiverName,
  });
};

/**
 * Initiate payment (creates or updates PENDING payment)
 */
// export const initiatePayment = async (req: AuthRequest, res: Response) => {
//   try {
//     const { maintenanceMonthId } = req.body;

//     if (!maintenanceMonthId) {
//       return res
//         .status(400)
//         .json({ message: "maintenanceMonthId is required" });
//     }

//     // Ensure maintenance month exists (IMPORTANT)
//     const maintenanceMonth =
//       await prisma.maintenanceMonth.findUnique({
//         where: { id: maintenanceMonthId },
//       });

//     if (!maintenanceMonth) {
//       return res.status(404).json({
//         message:
//           "Maintenance month not initialized. Please contact admin.",
//       });
//     }

//     // Fetch logged-in user and flat
//     const user = await prisma.user.findUnique({
//       where: { id: req.user.id },
//       include: { flat: true },
//     });

//     if (!user?.flat) {
//       return res
//         .status(400)
//         .json({ message: "No flat assigned" });
//     }

//     // Check if already PAID
//     const existingPaidPayment =
//       await prisma.payment.findFirst({
//         where: {
//           flatId: user.flat.id,
//           maintenanceMonthId,
//           status: "PAID",
//         },
//       });

//     if (existingPaidPayment) {
//       return res
//         .status(400)
//         .json({ message: "Already paid for this month" });
//     }

//     // Check if PENDING payment exists
//     const existingPendingPayment =
//       await prisma.payment.findFirst({
//         where: {
//           flatId: user.flat.id,
//           maintenanceMonthId,
//           status: "PENDING",
//         },
//       });

//     const transactionId = uuid();
//     let payment;

//     if (existingPendingPayment) {
//       // Update existing pending payment
//       payment = await prisma.payment.update({
//         where: { id: existingPendingPayment.id },
//         data: {
//           transactionId,
//           paymentMode: "UPI" as any, // until Prisma client regen
//           updatedAt: new Date(),
//         },
//       });
//     } else {
//       // Create new payment (FK-safe)
//       payment = await prisma.payment.create({
//         data: {
//           amount: user.flat.monthlyMaintenance,
//           status: "PENDING",
//           paymentMode: "UPI" as any,
//           transactionId,

//           flat: {
//             connect: { id: user.flat.id },
//           },
//           maintenanceMonth: {
//             connect: { id: maintenanceMonth.id },
//           },
//         },
//       });
//     }

//     res.status(201).json({
//       payment,
//       upiConfig: UPI_CONFIG,
//     });
//   } catch (error) {
//     console.error("Initiate payment error:", error);
//     res.status(500).json({
//       message: "Failed to initiate payment",
//     });
//   }
// };

export const initiatePayment = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required" });
    }

    // Fetch logged-in user + flat
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { flat: true },
    });

    if (!user?.flat) {
      return res.status(400).json({ message: "No flat assigned" });
    }

    // Find the correct MaintenanceMonth
    const maintenanceMonth = await prisma.maintenanceMonth.findUnique({
      where: {
        month_year: { month, year } // relies on your @@unique([month, year])
      }
    });

    if (!maintenanceMonth) {
      return res.status(404).json({
        message: "Maintenance month not initialized. Contact admin."
      });
    }

    // Check existing PAID payment
    const existingPaidPayment = await prisma.payment.findFirst({
      where: {
        flatId: user.flat.id,
        maintenanceMonthId: maintenanceMonth.id,
        status: "PAID"
      }
    });

    if (existingPaidPayment) {
      return res.status(400).json({ message: "Already paid for this month" });
    }

    // Check existing PENDING payment
    const existingPendingPayment = await prisma.payment.findFirst({
      where: {
        flatId: user.flat.id,
        maintenanceMonthId: maintenanceMonth.id,
        status: "PENDING"
      }
    });

    const transactionId = uuid();
    let payment;

    if (existingPendingPayment) {
      payment = await prisma.payment.update({
        where: { id: existingPendingPayment.id },
        data: {
          transactionId,
          paymentMode: "UPI" as any,
          updatedAt: new Date()
        }
      });
    } else {
      payment = await prisma.payment.create({
        data: {
          amount: user.flat.monthlyMaintenance,
          status: "PENDING",
          paymentMode: "UPI" as any,
          transactionId,
          flat: { connect: { id: user.flat.id } },
          maintenanceMonth: { connect: { id: maintenanceMonth.id } }
        }
      });
    }

    res.status(201).json({
      payment,
      upiConfig: UPI_CONFIG
    });

  } catch (error) {
    console.error("Initiate payment error:", error);
    res.status(500).json({ message: "Failed to initiate payment" });
  }
};

/**
 * Confirm payment manually (UPI success)
 */
export const confirmPayment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { paymentId, upiTransactionId } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { flat: { include: { user: true } } },
    });

    if (!payment) {
      return res
        .status(404)
        .json({ message: "Payment not found" });
    }

    // Ownership check
    if (payment.flat.user?.id !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Unauthorized" });
    }

    if (payment.status === "PAID") {
      return res.status(400).json({
        message: "Payment already confirmed",
      });
    }

    const updatedPayment =
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "PAID",
          paidAt: new Date(),
          upiTransactionId:
            upiTransactionId || undefined,
          updatedAt: new Date(),
        },
      });

    res.json(updatedPayment);
  } catch (error) {
    console.error("Confirm payment error:", error);
    res.status(500).json({
      message: "Failed to confirm payment",
    });
  }
};

// Get all payments (Admin only)
// export const getAllPayments = async (req: AuthRequest, res: Response) => {
//   try {
//     const payments = await prisma.payment.findMany({
//       include: {
//         flat: {
//           include: {
//             user: {
//               select: {
//                 id: true,
//                 name: true,
//                 email: true,
//               }
//             }
//           }
//         },
//         maintenanceMonth: true,
//       },
//       orderBy: [
//         { maintenanceMonth: { year: 'desc' } },
//         { maintenanceMonth: { month: 'desc' } },
//         { flat: { flatNumber: 'asc' } },
//       ],
//     });

//     res.json(payments);
//   } catch (error) {
//     console.error('Get all payments error:', error);
//     res.status(500).json({ message: 'Failed to fetch payments' });
//   }
// };
export const getAllPayments = async (req: AuthRequest, res: Response) => {
  try {
    // First, get all payments with flat and maintenance month data
    const payments = await prisma.payment.findMany({
      include: {
        flat: true,
        maintenanceMonth: true,
      },
      orderBy: [
        { maintenanceMonth: { year: 'desc' } },
        { maintenanceMonth: { month: 'desc' } },
        { flat: { flatNumber: 'asc' } },
      ],
    });

    // Get all users to map which user owns which flat
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        flatId: true,
      },
    });

    // Create a map of flatId -> user
    const flatUserMap = new Map();
    users.forEach(user => {
      if (user.flatId) {
        flatUserMap.set(user.flatId, user);
      }
    });

    // Enrich payment data with user information
    const enrichedPayments = payments.map(payment => {
      const user = flatUserMap.get(payment.flatId);
      
      return {
        ...payment,
        flat: {
          ...payment.flat,
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          } : null,
        },
      };
    });

    res.json(enrichedPayments);
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
};

/**
 * Verify payment by transactionId
 */
export const verifyPayment = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        message: "Transaction ID is required",
      });
    }

    const payment = await prisma.payment.findFirst({
      where: { transactionId },
      include: { flat: { include: { user: true } } },
    });

    if (!payment) {
      return res
        .status(404)
        .json({ message: "Payment not found" });
    }

    if (payment.flat.user?.id !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Unauthorized" });
    }

    res.json({
      status: payment.status,
      payment,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
    res.status(500).json({
      message: "Failed to verify payment",
    });
  }
};

/**
 * Get all payments of logged-in user
 */
export const getMyPayments = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    const payments = await prisma.payment.findMany({
      where: { flatId: user?.flatId || undefined },
      include: { maintenanceMonth: true },
      orderBy: { createdAt: "desc" },
    });

    res.json(payments);
  } catch (error) {
    console.error("Get payments error:", error);
    res.status(500).json({
      message: "Failed to fetch payments",
    });
  }
};

/**
 * Webhook handler (future payment gateway integration)
 */
export const handlePaymentWebhook = async (
  req: any,
  res: Response
) => {
  try {
    const {
      transactionId,
      status,
      upiTransactionId,
      gatewayResponse,
    } = req.body;

    const payment = await prisma.payment.findFirst({
      where: { transactionId },
    });

    if (!payment) {
      return res
        .status(404)
        .json({ message: "Payment not found" });
    }

    const paymentStatus =
      status === "success"
        ? "PAID"
        : ("FAILED" as any);

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: paymentStatus,
        upiTransactionId:
          upiTransactionId || undefined,
        upiResponse:
          gatewayResponse || undefined,
        paidAt:
          status === "success"
            ? new Date()
            : undefined,
        updatedAt: new Date(),
      },
    });

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({
      error: "Webhook processing failed",
    });
  }
};
