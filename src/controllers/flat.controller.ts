import { Response } from "express";
import prisma from "../config/databases";
import { AuthRequest } from "../middleware/auth.middleware";
import { createPendingPaymentForUser } from '../utils/payment.utils';


/**
 * Create a flat (Admin only)
 */
export const createFlat = async (req: AuthRequest, res: Response) => {
  const { flatNumber, ownerName, ownerEmail, ownerPhone, monthlyMaintenance } = req.body;

  try {
    const flat = await prisma.flat.create({
      data: {
        flatNumber,
        ownerName,
        ownerEmail,
        ownerPhone: ownerPhone || null,
        monthlyMaintenance,
      },
    });

    res.status(201).json(flat);
  } catch (error) {
    console.error("Create flat error:", error);
    res.status(500).json({ message: "Failed to create flat" });
  }
};

/**
 * Get all flats (Admin only)
 * IMPORTANT: ownership is derived from users[]
 */
export const getAllFlats = async (req: AuthRequest, res: Response) => {
  try {
    const flats = await prisma.flat.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        flatNumber: "asc",
      },
    });

    res.json(flats);
  } catch (error) {
    console.error("Get all flats error:", error);
    res.status(500).json({ message: "Failed to fetch flats" });
  }
};

/**
 * Assign a flat to a user (Admin only)
 * Source of truth = User.flatId
 */

export const assignFlatToUser = async (req: AuthRequest, res: Response) => {
  const { userId, flatId } = req.body;

  try {
    // 1️⃣ Fetch user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ Fetch flat
    const flat = await prisma.flat.findUnique({
      where: { id: flatId },
    });

    if (!flat) {
      return res.status(404).json({ message: "Flat not found" });
    }

    // 3️⃣ Check if flat is already assigned to another user
    const existingAssignment = await prisma.user.findFirst({
      where: {
        flatId: flatId,
        id: { not: userId },
      },
    });

    if (existingAssignment) {
      return res.status(400).json({
        message: `Flat ${flat.flatNumber} is already assigned to ${existingAssignment.name}`,
      });
    }

    // 4️⃣ Unassign previous flat (if user had another flat)
    if (user.flatId && user.flatId !== flatId) {
      await prisma.user.update({
        where: { id: userId },
        data: { flatId: null },
      });
    }

    // 5️⃣ Assign flat to user
    await prisma.user.update({
      where: { id: userId },
      data: { flatId },
    });

    // 6️⃣ Update flat owner details
    const updatedFlat = await prisma.flat.update({
      where: { id: flatId },
      data: {
        ownerName: user.name,
        ownerEmail: user.email,
        ownerPhone: user.phone || null,
      },
    });

    // 7️⃣ ⭐ CREATE PENDING PAYMENT FOR CURRENT MONTH
    let paymentCreated = false;
    try {
      await createPendingPaymentForUser(userId);
      paymentCreated = true;
      console.log(`✅ Created pending payment for user ${user.name}`);
    } catch (paymentError) {
      console.error('⚠️  Payment creation failed (non-critical):', paymentError);
      // Don't fail the assignment if payment creation fails
    }

    res.json({
      message: "Flat assigned successfully",
      flat: updatedFlat,
      paymentCreated,
    });
  } catch (error) {
    console.error("Assign flat error:", error);
    res.status(500).json({ message: "Failed to assign flat" });
  }
};

/**
 * Get logged-in user's flat
 */
export const getMyFlat = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { flat: true },
    });

    res.json(user?.flat ?? null);
  } catch (error) {
    console.error("Get my flat error:", error);
    res.status(500).json({ message: "Failed to fetch flat" });
  }
};
