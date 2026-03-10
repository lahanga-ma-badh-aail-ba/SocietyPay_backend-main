import { Router } from "express";
import {
  createFlat,
  assignFlatToUser,
  getMyFlat,
  getAllFlats,
} from "../controllers/flat.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.post("/", authMiddleware, requireRole("ADMIN"), createFlat);
router.post("/assign", authMiddleware, requireRole("ADMIN"), assignFlatToUser);
router.get("/me", authMiddleware, getMyFlat);
// Add this route (admin only)
router.get("/all", authMiddleware, requireRole("ADMIN"), getAllFlats);

export default router;
