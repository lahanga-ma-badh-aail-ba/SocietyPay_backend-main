import prisma from '../config/databases';

/**
 * Creates a PENDING payment for a user's flat for the current maintenance month
 */
export const createPendingPaymentForUser = async (userId: string) => {
  try {
    // Get user with flat
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { flat: true },
    });

    if (!user?.flat) {
      console.log(`User ${userId} has no flat assigned, skipping payment creation`);
      return null;
    }

    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Find or create maintenance month for current month
    let maintenanceMonth = await prisma.maintenanceMonth.findUnique({
      where: {
        month_year: {
          month: currentMonth,
          year: currentYear,
        },
      },
    });

    if (!maintenanceMonth) {
      // Create maintenance month if it doesn't exist
      maintenanceMonth = await prisma.maintenanceMonth.create({
        data: {
          month: currentMonth,
          year: currentYear,
        },
      });
    }

    // Check if payment already exists for this month
    const existingPayment = await prisma.payment.findFirst({
      where: {
        flatId: user.flat.id,
        maintenanceMonthId: maintenanceMonth.id,
      },
    });

    if (existingPayment) {
      console.log(`Payment already exists for flat ${user.flat.flatNumber}`);
      return existingPayment;
    }

    // Create PENDING payment
    const payment = await prisma.payment.create({
      data: {
        amount: user.flat.monthlyMaintenance,
        status: 'PENDING',
        flat: {
          connect: { id: user.flat.id },
        },
        maintenanceMonth: {
          connect: { id: maintenanceMonth.id },
        },
      },
    });

    console.log(`✅ Created pending payment for user ${user.name}, flat ${user.flat.flatNumber}`);
    return payment;
  } catch (error) {
    console.error('Error creating pending payment:', error);
    throw error;
  }
};

/**
 * Creates PENDING payments for all users with assigned flats for current month
 */
export const createMonthlyPaymentsForAllUsers = async () => {
  try {
    const users = await prisma.user.findMany({
      where: {
        flatId: { not: null },
      },
      include: { flat: true },
    });

    console.log(`Creating payments for ${users.length} users...`);

    const results = await Promise.allSettled(
      users.map(user => createPendingPaymentForUser(user.id))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Payment creation complete: ${successful} successful, ${failed} failed`);
    
    return { successful, failed, total: users.length };
  } catch (error) {
    console.error('Error creating monthly payments:', error);
    throw error;
  }
};

/**
 * Marks overdue PENDING payments as FAILED
 * Deadline: 10th of the month
 */
export const markOverduePaymentsAsFailed = async () => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    // Only mark as failed after the 10th
    if (currentDay <= 10) {
      console.log('Not yet past payment deadline (10th of month)');
      return { updated: 0 };
    }

    // Find current maintenance month
    const maintenanceMonth = await prisma.maintenanceMonth.findUnique({
      where: {
        month_year: {
          month: currentMonth,
          year: currentYear,
        },
      },
    });

    if (!maintenanceMonth) {
      console.log('No maintenance month found for current period');
      return { updated: 0 };
    }

    // Update all PENDING payments for current month to FAILED
    const result = await prisma.payment.updateMany({
      where: {
        maintenanceMonthId: maintenanceMonth.id,
        status: 'PENDING',
      },
      data: {
        status: 'FAILED',
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Marked ${result.count} overdue payments as FAILED`);
    return { updated: result.count };
  } catch (error) {
    console.error('Error marking overdue payments:', error);
    throw error;
  }
};