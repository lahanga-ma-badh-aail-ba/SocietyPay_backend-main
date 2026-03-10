import { Router } from "express";
import {
  createMaintenanceMonth,
  getCurrentMaintenanceMonth,
} from "../controllers/maintenance.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";

const router = Router();

router.post(
  "/month",
  authMiddleware,
  requireRole("ADMIN"),
  createMaintenanceMonth
);

router.get("/month/current", authMiddleware, getCurrentMaintenanceMonth);

export default router;
