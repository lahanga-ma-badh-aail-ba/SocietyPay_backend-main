// import { Response } from "express";
// import prisma from "../config/databases";
// import { AuthRequest } from "../middleware/auth.middleware";
// import { generateReceiptPDF } from "../services/pdfService";

// /**
//  * Generate receipt manually for a specific payment
//  */
// export const generateReceipt = async (req: AuthRequest, res: Response) => {
//   const { paymentId } = req.params;

//   try {
//     const payment = await prisma.payment.findUnique({
//       where: { id: paymentId },
//       include: {
//         flat: true,
//         maintenanceMonth: true
//       }
//     });

//     if (!payment) {
//       return res.status(404).json({ message: "Payment not found" });
//     }

//     if (payment.status !== "PAID") {
//       return res.status(400).json({ message: "Payment is not PAID yet" });
//     }

//     // Check if receipt already exists
//     const existingReceipt = await prisma.receipt.findUnique({
//       where: { paymentId },
//     });

//     if (existingReceipt) {
//       return res.status(400).json({ 
//         message: "Receipt already exists for this payment",
//         receipt: existingReceipt 
//       });
//     }

//     // Generate receipt
//     const receiptNumber = `RCT-${Date.now()}`;
//     const pdfBuffer = generateReceiptPDF({
//       receiptNumber,
//       flatNumber: payment.flat.flatNumber,
//       ownerName: payment.flat.ownerName,
//       month: payment.maintenanceMonth.month,
//       year: payment.maintenanceMonth.year,
//       amount: payment.amount,
//       paymentMode: payment.paymentMode || "UPI",
//       transactionId: payment.transactionId || "N/A",
//       paidAt: payment.paidAt || new Date(),
//     });

//     const receipt = await prisma.receipt.create({
//       data: {
//         paymentId,
//         receiptNumber,
//         // pdfData: pdfBuffer,
//         emailSent: false,
//       },
//     });

//     res.status(201).json(receipt);
//   } catch (error) {
//     console.error("Generate receipt error:", error);
//     res.status(500).json({ message: "Failed to generate receipt" });
//   }
// };

// /**
//  * Generate receipts for all PAID payments that don't have receipts yet
//  * Admin only endpoint
//  */
// export const generateMissingReceipts = async (req: AuthRequest, res: Response) => {
//   try {
//     // Find all PAID payments without receipts
//     const paymentsWithoutReceipts = await prisma.payment.findMany({
//       where: {
//         status: "PAID",
//         receipt: null
//       },
//       include: {
//         flat: true,
//         maintenanceMonth: true
//       }
//     });

//     if (paymentsWithoutReceipts.length === 0) {
//       return res.json({
//         message: "All PAID payments already have receipts",
//         count: 0
//       });
//     }

//     const generatedReceipts = [];
//     const errors = [];

//     // Generate receipt for each payment
//     for (const payment of paymentsWithoutReceipts) {
//       try {
//         const receiptNumber = `RCT-${Date.now()}-${payment.id.slice(0, 8)}`;
        
//         // Generate PDF
//         const pdfBuffer = generateReceiptPDF({
//           receiptNumber,
//           flatNumber: payment.flat.flatNumber,
//           ownerName: payment.flat.ownerName,
//           month: payment.maintenanceMonth.month,
//           year: payment.maintenanceMonth.year,
//           amount: payment.amount,
//           paymentMode: payment.paymentMode || "UPI",
//           transactionId: payment.transactionId || "N/A",
//           paidAt: payment.paidAt || new Date(),
//         });

//         // Create receipt
//         const receipt = await prisma.receipt.create({
//           data: {
//             paymentId: payment.id,
//             receiptNumber,
//             // pdfData: pdfBuffer,
//             emailSent: false,
//           }
//         });

//         generatedReceipts.push({
//           paymentId: payment.id,
//           receiptNumber: receipt.receiptNumber,
//           flatNumber: payment.flat.flatNumber,
//           amount: payment.amount,
//         });

//         console.log(`✅ Generated receipt ${receipt.receiptNumber} for payment ${payment.id}`);
        
//         // Small delay to ensure unique timestamps
//         await new Promise(resolve => setTimeout(resolve, 10));

//       } catch (error) {
//         console.error(`❌ Failed to generate receipt for payment ${payment.id}:`, error);
//         errors.push({
//           paymentId: payment.id,
//           error: error instanceof Error ? error.message : "Unknown error"
//         });
//       }
//     }

//     res.json({
//       message: "Receipt generation completed",
//       total: paymentsWithoutReceipts.length,
//       success: generatedReceipts.length,
//       failed: errors.length,
//       receipts: generatedReceipts,
//       errors: errors.length > 0 ? errors : undefined
//     });

//   } catch (error) {
//     console.error("Generate missing receipts error:", error);
//     res.status(500).json({
//       message: "Failed to generate receipts",
//       error: error instanceof Error ? error.message : "Unknown error"
//     });
//   }
// };

// /**
//  * Get all receipts for the logged-in user
//  */
// export const getMyReceipts = async (req: AuthRequest, res: Response) => {
//   try {
//     const user = await prisma.user.findUnique({
//       where: { id: req.user.id },
//       select: { flatId: true },
//     });

//     if (!user?.flatId) {
//       return res.status(400).json({ message: "No flat assigned" });
//     }

//     const receipts = await prisma.receipt.findMany({
//       where: {
//         payment: {
//           flatId: user.flatId,
//           status: "PAID"
//         },
//       },
//       include: {
//         payment: {
//           include: {
//             maintenanceMonth: true,
//             receipt: true,
//             flat: {
//               select: {
//                 flatNumber: true,
//                 ownerName: true,
//               }
//             },
//             user: {
//               select: {
//                 name: true,
//               }
//             }
//           }
//         }
//       },
//       orderBy: {
//         createdAt: 'desc'
//       }
//     });

//     res.json(receipts);
//   } catch (error) {
//     console.error("Error fetching receipts:", error);
//     res.status(500).json({ message: "Failed to fetch receipts" });
//   }
// };

// /**
//  * Get a specific receipt with full details
//  */
// export const getReceiptById = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;

//     const receipt = await prisma.receipt.findUnique({
//       where: { id },
//       include: {
//         payment: {
//           include: {
//             maintenanceMonth: true,
//             flat: {
//               select: {
//                 flatNumber: true,
//                 ownerName: true,
//                 ownerEmail: true,
//               }
//             },
//             user: {
//               select: {
//                 name: true,
//               }
//             }
//           }
//         }
//       }
//     });

//     if (!receipt) {
//       return res.status(404).json({ message: "Receipt not found" });
//     }

//     // Verify ownership
//     const user = await prisma.user.findUnique({
//       where: { id: req.user.id },
//       select: { flatId: true, role: true },
//     });

//     // Allow if user owns the flat OR is an admin
//     if (receipt.payment.flatId !== user?.flatId && user?.role !== "ADMIN") {
//       return res.status(403).json({ message: "Unauthorized" });
//     }

//     res.json(receipt);
//   } catch (error) {
//     console.error("Error fetching receipt:", error);
//     res.status(500).json({ message: "Failed to fetch receipt" });
//   }
// };

// /**
//  * Download receipt PDF
//  */
// export const downloadReceiptPDF = async (req: AuthRequest, res: Response) => {
//   try {
//     const { id } = req.params;

//     const receipt = await prisma.receipt.findUnique({
//       where: { id },
//       include: {
//         payment: true
//       }
//     });

//     if (!receipt) {
//       return res.status(404).json({ message: "Receipt not found" });
//     }

//     // Verify ownership
//     const user = await prisma.user.findUnique({
//       where: { id: req.user.id },
//       select: { flatId: true, role: true },
//     });

//     // Allow if user owns the flat OR is an admin
//     if (receipt.payment.flatId !== user?.flatId && user?.role !== "ADMIN") {
//       return res.status(403).json({ message: "Unauthorized" });
//     }

//     res.setHeader('Content-Type', 'application/pdf');
//     res.setHeader('Content-Disposition', `attachment; filename="${receipt.receiptNumber}.pdf"`);
//     // res.send(receipt.pdfData);
//   } catch (error) {
//     console.error("Error downloading receipt:", error);
//     res.status(500).json({ message: "Failed to download receipt" });
//   }
// };

import { Response } from "express";
import prisma from "../config/databases";
import { AuthRequest } from "../middleware/auth.middleware";
import { generateReceiptPDF } from "../services/pdfService";

/**
 * Generate receipt manually for a specific payment
 */
export const generateReceipt = async (req: AuthRequest, res: Response) => {
  const { paymentId } = req.params;

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        flat: true,
        maintenanceMonth: true
      }
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    if (payment.status !== "PAID") {
      return res.status(400).json({ message: "Payment is not PAID yet" });
    }

    // Check if receipt already exists
    const existingReceipt = await prisma.receipt.findUnique({
      where: { paymentId },
    });

    if (existingReceipt) {
      return res.status(400).json({ 
        message: "Receipt already exists for this payment",
        receipt: existingReceipt 
      });
    }

    // Generate receipt
    const receiptNumber = `RCT-${Date.now()}`;
    const pdfBuffer = generateReceiptPDF({
      receiptNumber,
      flatNumber: payment.flat.flatNumber,
      ownerName: payment.flat.ownerName,
      month: payment.maintenanceMonth.month,
      year: payment.maintenanceMonth.year,
      amount: payment.amount,
      paymentMode: payment.paymentMode || "UPI",
      transactionId: payment.transactionId || "N/A",
      paidAt: payment.paidAt || new Date(),
    });

    const receipt = await prisma.receipt.create({
      data: {
        paymentId,
        receiptNumber,
        // pdfData: pdfBuffer,
        emailSent: false,
      },
    });

    res.status(201).json(receipt);
  } catch (error) {
    console.error("Generate receipt error:", error);
    res.status(500).json({ message: "Failed to generate receipt" });
  }
};

/**
 * Generate receipts for all PAID payments that don't have receipts yet
 * Admin only endpoint
 */
export const generateMissingReceipts = async (req: AuthRequest, res: Response) => {
  try {
    // Find all PAID payments without receipts
    const paymentsWithoutReceipts = await prisma.payment.findMany({
      where: {
        status: "PAID",
        receipt: null
      },
      include: {
        flat: true,
        maintenanceMonth: true
      }
    });

    if (paymentsWithoutReceipts.length === 0) {
      return res.json({
        message: "All PAID payments already have receipts",
        count: 0
      });
    }

    const generatedReceipts = [];
    const errors = [];

    // Generate receipt for each payment
    for (const payment of paymentsWithoutReceipts) {
      try {
        const receiptNumber = `RCT-${Date.now()}-${payment.id.slice(0, 8)}`;
        
        // Generate PDF
        const pdfBuffer = generateReceiptPDF({
          receiptNumber,
          flatNumber: payment.flat.flatNumber,
          ownerName: payment.flat.ownerName,
          month: payment.maintenanceMonth.month,
          year: payment.maintenanceMonth.year,
          amount: payment.amount,
          paymentMode: payment.paymentMode || "UPI",
          transactionId: payment.transactionId || "N/A",
          paidAt: payment.paidAt || new Date(),
        });

        // Create receipt
        const receipt = await prisma.receipt.create({
          data: {
            paymentId: payment.id,
            receiptNumber,
            // pdfData: pdfBuffer,
            emailSent: false,
          }
        });

        generatedReceipts.push({
          paymentId: payment.id,
          receiptNumber: receipt.receiptNumber,
          flatNumber: payment.flat.flatNumber,
          amount: payment.amount,
        });

        console.log(`✅ Generated receipt ${receipt.receiptNumber} for payment ${payment.id}`);
        
        // Small delay to ensure unique timestamps
        await new Promise(resolve => setTimeout(resolve, 10));

      } catch (error) {
        console.error(`❌ Failed to generate receipt for payment ${payment.id}:`, error);
        errors.push({
          paymentId: payment.id,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    res.json({
      message: "Receipt generation completed",
      total: paymentsWithoutReceipts.length,
      success: generatedReceipts.length,
      failed: errors.length,
      receipts: generatedReceipts,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("Generate missing receipts error:", error);
    res.status(500).json({
      message: "Failed to generate receipts",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

/**
 * Get all receipts for the logged-in user
 */
export const getMyReceipts = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { flatId: true, name: true },
    });

    if (!user?.flatId) {
      return res.status(400).json({ message: "No flat assigned" });
    }

    const receipts = await prisma.receipt.findMany({
      where: {
        payment: {
          flatId: user.flatId,
          status: "PAID"
        },
      },
      include: {
        payment: {
          include: {
            maintenanceMonth: true,
            receipt: true,
            flat: {
              select: {
                flatNumber: true,
                ownerName: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Manually attach user info to each receipt's payment
    const receiptsWithUser = receipts.map(receipt => ({
      ...receipt,
      payment: {
        ...receipt.payment,
        user: {
          name: user.name
        }
      }
    }));

    res.json(receiptsWithUser);
  } catch (error) {
    console.error("Error fetching receipts:", error);
    res.status(500).json({ message: "Failed to fetch receipts" });
  }
};

/**
 * Get a specific receipt with full details
 */
export const getReceiptById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        payment: {
          include: {
            maintenanceMonth: true,
            flat: {
              select: {
                flatNumber: true,
                ownerName: true,
                ownerEmail: true,
              }
            }
          }
        }
      }
    });

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    // Verify ownership and get user info
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { flatId: true, role: true, name: true },
    });

    // Allow if user owns the flat OR is an admin
    if (receipt.payment.flatId !== user?.flatId && user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Attach user info
    const receiptWithUser = {
      ...receipt,
      payment: {
        ...receipt.payment,
        user: {
          name: user.name
        }
      }
    };

    res.json(receiptWithUser);
  } catch (error) {
    console.error("Error fetching receipt:", error);
    res.status(500).json({ message: "Failed to fetch receipt" });
  }
};

/**
 * Download receipt PDF
 */
export const downloadReceiptPDF = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        payment: true
      }
    });

    if (!receipt) {
      return res.status(404).json({ message: "Receipt not found" });
    }

    // Verify ownership
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { flatId: true, role: true },
    });

    // Allow if user owns the flat OR is an admin
    if (receipt.payment.flatId !== user?.flatId && user?.role !== "ADMIN") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receipt.receiptNumber}.pdf"`);
    // res.send(receipt.pdfData);
  } catch (error) {
    console.error("Error downloading receipt:", error);
    res.status(500).json({ message: "Failed to download receipt" });
  }
};