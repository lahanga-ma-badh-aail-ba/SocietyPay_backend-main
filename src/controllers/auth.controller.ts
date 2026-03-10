import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/databases";
import { createPendingPaymentForUser } from '../utils/payment.utils';

// Register a new user
// export const register = async (req: Request, res: Response) => {
//   try {
//     const { name, email, password, role, flatId, ownerName, ownerEmail, monthlyMaintenance } = req.body;

//     // Validate required fields
//     if (!name || !email || !password) {
//       return res.status(400).json({ 
//         message: "Name, email, and password are required" 
//       });
//     }

//     // Check if user already exists
//     const existingUser = await prisma.user.findUnique({
//       where: { email },
//     });

//     if (existingUser) {
//       return res.status(400).json({ message: "User already exists" });
//     }

//     let actualFlatId = null;

//     // If flatId (flatNumber) is provided, create or find the flat
//     if (flatId && flatId.trim() !== "") {
//       const flatNumber = flatId.trim();

//       // Check if flat already exists
//       let flat = await prisma.flat.findUnique({
//         where: { flatNumber },
//       });

//       if (flat) {
//         // Flat exists, check if it's already assigned to another user
//         const flatAlreadyAssigned = await prisma.user.findFirst({
//           where: { flatId: flat.id },
//         });

//         if (flatAlreadyAssigned) {
//           return res.status(400).json({ 
//             message: `Flat ${flatNumber} is already assigned to ${flatAlreadyAssigned.name}` 
//           });
//         }

//         actualFlatId = flat.id;
//       } else {
//         // Flat doesn't exist, create it
//         // Validate flat creation fields
//         if (!ownerName || !monthlyMaintenance) {
//           return res.status(400).json({ 
//             message: "For new flats, please provide owner name and monthly maintenance amount" 
//           });
//         }

//         flat = await prisma.flat.create({
//           data: {
//             flatNumber,
//             ownerName: ownerName || name, // Use registering user's name if ownerName not provided
//             ownerEmail: ownerEmail || email, // Use registering user's email if ownerEmail not provided
//             monthlyMaintenance: parseFloat(monthlyMaintenance),
//           },
//         });

//         actualFlatId = flat.id;
//       }
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create user
//     const user = await prisma.user.create({
//       data: {
//         name,
//         email,
//         password: hashedPassword,
//         role: role || "USER",
//         flatId: actualFlatId,
//       },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         role: true,
//         flatId: true,
//         flat: {
//           select: {
//             id: true,
//             flatNumber: true,
//             ownerName: true,
//             monthlyMaintenance: true,
//           },
//         },
//         createdAt: true,
//       },
//     });

//     res.status(201).json({
//       message: "User registered successfully",
//       user,
//     });
//   } catch (error) {
//     console.error("Registration error:", error);
//     res.status(500).json({ message: "Registration failed" });
//   }
// };

export interface AuthRequest extends Request {
  user?: any;
}

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, flatId, ownerName, ownerEmail, monthlyMaintenance } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        message: "Name, email, and password are required" 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    let actualFlatId = null;

    // If flatId (flatNumber) is provided, create or find the flat
    if (flatId && flatId.trim() !== "") {
      const flatNumber = flatId.trim();

      // Check if flat already exists
      let flat = await prisma.flat.findUnique({
        where: { flatNumber },
      });

      if (flat) {
        // Flat exists, check if it's already assigned to another user
        const flatAlreadyAssigned = await prisma.user.findFirst({
          where: { flatId: flat.id },
        });

        if (flatAlreadyAssigned) {
          return res.status(400).json({ 
            message: `Flat ${flatNumber} is already assigned to ${flatAlreadyAssigned.name}` 
          });
        }

        actualFlatId = flat.id;
      } else {
        // Flat doesn't exist, create it
        // Validate flat creation fields
        if (!ownerName || !monthlyMaintenance) {
          return res.status(400).json({ 
            message: "For new flats, please provide owner name and monthly maintenance amount" 
          });
        }

        flat = await prisma.flat.create({
          data: {
            flatNumber,
            ownerName: ownerName || name,
            ownerEmail: ownerEmail || email,
            monthlyMaintenance: parseFloat(monthlyMaintenance),
          },
        });

        actualFlatId = flat.id;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "USER",
        flatId: actualFlatId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        flatId: true,
        flat: {
          select: {
            id: true,
            flatNumber: true,
            ownerName: true,
            monthlyMaintenance: true,
          },
        },
        createdAt: true,
      },
    });

    // ⭐ CREATE PENDING PAYMENT FOR CURRENT MONTH (if flat assigned)
    if (user.flatId) {
      try {
        await createPendingPaymentForUser(user.id);
        console.log(`✅ Created pending payment for new user: ${user.email}`);
      } catch (error) {
        console.error('⚠️  Failed to create pending payment for new user:', error);
        // Don't fail registration if payment creation fails
      }
    }

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        message: "Email and password are required" 
      });
    }

    // Find user with flat details
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        flat: {
          select: {
            id: true,
            flatNumber: true,
            ownerName: true,
            monthlyMaintenance: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id,
        userId: user.id,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        flatId: user.flatId,
        flat: user.flat,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed" });
  }
};

// Get all users (Admin only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        flatId: true,
        flat: {
          select: {
            id: true,
            flatNumber: true,
            ownerName: true,
            ownerEmail: true,
            monthlyMaintenance: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      message: "Users fetched successfully",
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        flatId: true,
        flat: {
          select: {
            id: true,
            flatNumber: true,
            ownerName: true,
            ownerEmail: true,
            monthlyMaintenance: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User fetched successfully",
      user,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

// Get current user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    // req.user is set by authMiddleware
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        flatId: true,
        flat: {
          select: {
            id: true,
            flatNumber: true,
            ownerName: true,
            ownerEmail: true,
            monthlyMaintenance: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Profile fetched successfully",
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// Update user
// export const updateUser = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { name, email, role, flatId } = req.body;

//     // Check if user exists
//     const existingUser = await prisma.user.findUnique({
//       where: { id },
//     });

//     if (!existingUser) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // If email is being changed, check if new email is available
//     if (email && email !== existingUser.email) {
//       const emailTaken = await prisma.user.findUnique({
//         where: { email },
//       });

//       if (emailTaken) {
//         return res.status(400).json({ message: "Email already in use" });
//       }
//     }

//     let actualFlatId = existingUser.flatId;

//     // If flatId is being changed, validate it
//     if (flatId !== undefined && flatId !== existingUser.flatId) {
//       if (flatId && flatId.trim() !== "") {
//         // If flatId looks like a flat number (e.g., "A-101"), look it up
//         // If it's a UUID, use it directly
//         const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(flatId);
        
//         let flat;
//         if (isUUID) {
//           flat = await prisma.flat.findUnique({
//             where: { id: flatId },
//           });
//         } else {
//           flat = await prisma.flat.findUnique({
//             where: { flatNumber: flatId.trim() },
//           });
//         }

//         if (!flat) {
//           return res.status(404).json({ 
//             message: `Flat "${flatId}" not found` 
//           });
//         }

//         // Check if flat is already assigned to another user
//         const flatAlreadyAssigned = await prisma.user.findFirst({
//           where: { 
//             flatId: flat.id,
//             id: { not: id },
//           },
//         });

//         if (flatAlreadyAssigned) {
//           return res.status(400).json({ 
//             message: `Flat ${flat.flatNumber} is already assigned to ${flatAlreadyAssigned.name}` 
//           });
//         }

//         actualFlatId = flat.id;
//       } else {
//         // Empty string means remove flat assignment
//         actualFlatId = null;
//       }
//     }

//     // Update user
//     const updatedUser = await prisma.user.update({
//       where: { id },
//       data: {
//         ...(name && { name }),
//         ...(email && { email }),
//         ...(role && { role }),
//         ...(flatId !== undefined && { flatId: actualFlatId }),
//       },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         role: true,
//         flatId: true,
//         flat: {
//           select: {
//             id: true,
//             flatNumber: true,
//             ownerName: true,
//           },
//         },
//         updatedAt: true,
//       },
//     });

//     res.json({
//       message: "User updated successfully",
//       user: updatedUser,
//     });
//   } catch (error) {
//     console.error("Update user error:", error);
//     res.status(500).json({ message: "Failed to update user" });
//   }
// };
export const updateUser = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const {
    name,
    email,
    role,
    flatId,
    ownerName,
    monthlyMaintenance,
  } = req.body;

  try {
    // 1️⃣ Get previous flat (important!)
    const previousUser = await prisma.user.findUnique({
      where: { id },
      select: { flatId: true },
    });

    // 2️⃣ Update user
    await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role,
        flatId: flatId ?? null,
      },
    });

    // 3️⃣ If flat changed, clear old flat owner
    if (previousUser?.flatId && previousUser.flatId !== flatId) {
      await prisma.flat.update({
        where: { id: previousUser.flatId },
        data: {
          ownerName: "",
          ownerEmail: "",
        },
      });
    }

    // 4️⃣ Update current flat (🔥 THIS WAS MISSING)
    if (flatId) {
      await prisma.flat.update({
        where: { id: flatId },
        data: {
          ownerName: ownerName || name,
          ownerEmail: email,
          monthlyMaintenance: monthlyMaintenance ?? undefined,
        },
      });
    }

    res.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Failed to update user" });
  }
};


// Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    res.json({
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
};