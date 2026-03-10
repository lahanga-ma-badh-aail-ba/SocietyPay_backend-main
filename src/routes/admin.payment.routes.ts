import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/roleCheck.middleware';
import { 
  createMonthlyPaymentsForAllUsers, 
  markOverduePaymentsAsFailed 
} from '../utils/payment.utils';

const router = Router();

/**
 * Manually trigger monthly payment creation for all users
 * Admin only
 */
router.post(
  '/create-monthly-payments',
  authMiddleware,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const result = await createMonthlyPaymentsForAllUsers();
      res.json({
        message: 'Monthly payments created successfully',
        successful: result.successful,
        failed: result.failed,
        total: result.total,
      });
    } catch (error) {
      console.error('Create monthly payments error:', error);
      res.status(500).json({ message: 'Failed to create monthly payments' });
    }
  }
);

/**
 * Manually trigger overdue payment check
 * Admin only
 */
router.post(
  '/mark-overdue-payments',
  authMiddleware,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const result = await markOverduePaymentsAsFailed();
      res.json({
        message: result.updated > 0 
          ? `Marked ${result.updated} payments as failed`
          : 'No overdue payments found',
        updated: result.updated,
      });
    } catch (error) {
      console.error('Mark overdue payments error:', error);
      res.status(500).json({ message: 'Failed to mark overdue payments' });
    }
  }
);

export default router;