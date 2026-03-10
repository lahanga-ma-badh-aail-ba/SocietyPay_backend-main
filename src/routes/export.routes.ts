
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/roleCheck.middleware';
import { exportPaymentsCSV } from '../controllers/export.controller';

const router = Router();

// Export payments as CSV (Admin only)
router.get('/payments/csv', authMiddleware, requireRole('ADMIN'), exportPaymentsCSV);

export default router;