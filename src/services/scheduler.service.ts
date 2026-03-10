import { 
  createMonthlyPaymentsForAllUsers, 
  markOverduePaymentsAsFailed 
} from '../utils/payment.utils';

/**
 * Scheduler Service
 * Handles automated payment tasks
 */
class SchedulerService {
  private dailyCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Start the scheduler
   */
  start() {
    console.log('🕐 Starting payment scheduler...');

    // Run checks immediately on startup
    this.checkOverduePayments();

    // Schedule daily checks at midnight
    this.scheduleDailyChecks();

    console.log('✅ Payment scheduler started');
  }

  /**
   * Schedule daily checks
   * Runs every day at midnight
   */
  private scheduleDailyChecks() {
    // Run every 24 hours
    this.dailyCheckInterval = setInterval(() => {
      const now = new Date();
      console.log(`🔍 Running daily payment checks at ${now.toISOString()}`);
      
      // Check for overdue payments
      this.checkOverduePayments();
      
      // If it's the 1st of the month, create new payments
      if (now.getDate() === 1) {
        this.createMonthlyPayments();
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    console.log('📅 Daily checks scheduled (runs every 24 hours)');
  }

  /**
   * Check and mark overdue payments as FAILED
   */
  private async checkOverduePayments() {
    try {
      console.log('🔍 Checking for overdue payments...');
      const result = await markOverduePaymentsAsFailed();
      
      if (result.updated > 0) {
        console.log(`✅ Marked ${result.updated} payments as FAILED`);
      } else {
        console.log('✅ No overdue payments found');
      }
    } catch (error) {
      console.error('❌ Error checking overdue payments:', error);
    }
  }

  /**
   * Create monthly payments for all users
   */
  private async createMonthlyPayments() {
    try {
      console.log('📝 Creating monthly payments for all users...');
      const result = await createMonthlyPaymentsForAllUsers();
      console.log(`✅ Created ${result.successful}/${result.total} payments successfully`);
    } catch (error) {
      console.error('❌ Error creating monthly payments:', error);
    }
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.dailyCheckInterval) {
      clearInterval(this.dailyCheckInterval);
      console.log('🛑 Payment scheduler stopped');
    }
  }

  /**
   * Manual trigger for creating monthly payments (for admin use)
   */
  async triggerMonthlyPayments() {
    return this.createMonthlyPayments();
  }

  /**
   * Manual trigger for checking overdue payments (for admin use)
   */
  async triggerOverdueCheck() {
    return this.checkOverduePayments();
  }
}

// Export singleton instance
export const paymentScheduler = new SchedulerService();