import { Router } from "express";
import { 
  login, 
  register, 
  getAllUsers, 
  getUserById,
  getProfile,
  updateUser,
  deleteUser,
  getAdminContact
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/roleCheck.middleware";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected routes (require authentication)
router.get("/profile", authMiddleware, getProfile);
router.get('/contact', getAdminContact);

// Admin only routes
router.get("/users", authMiddleware, requireRole("ADMIN"), getAllUsers);
router.get("/users/:id", authMiddleware, requireRole("ADMIN"), getUserById);
router.put("/users/:id", authMiddleware, requireRole("ADMIN"), updateUser);
router.delete("/users/:id", authMiddleware, requireRole("ADMIN"), deleteUser);

export default router;