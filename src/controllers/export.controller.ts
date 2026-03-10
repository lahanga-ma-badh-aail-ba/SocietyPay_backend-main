import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../config/databases';

export const exportPaymentsCSV = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;

    let whereClause: any = {};

    if (month && year) {
      const maintenanceMonth = await prisma.maintenanceMonth.findUnique({
        where: {
          month_year: {
            month: parseInt(month as string),
            year: parseInt(year as string),
          },
        },
      });

      if (maintenanceMonth) {
        whereClause.maintenanceMonthId = maintenanceMonth.id;
      }
    }

    // Fetch all payments with flat and maintenance month
    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        flat: true,
        maintenanceMonth: true,
      },
      orderBy: [
        { maintenanceMonth: { year: 'desc' } },
        { maintenanceMonth: { month: 'desc' } },
        { flat: { flatNumber: 'asc' } },
      ],
    });

    // Get all users to find which user owns which flat
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        flatId: true,
      },
    });

    // Create a map of flatId -> user for quick lookup
    const flatUserMap = new Map();
    users.forEach(user => {
      if (user.flatId) {
        flatUserMap.set(user.flatId, user);
      }
    });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const csvHeaders = [
      'Date',
      'Time',
      'Name',
      'Email',
      'Flat No',
      'Role',
      'Month',
      'Amount',
      'Paid/Unpaid',
    ];

    const csvRows = payments.map((payment) => {
      const paidDate = payment.paidAt ? new Date(payment.paidAt) : null;
      const date = paidDate ? paidDate.toLocaleDateString('en-IN') : 'N/A';
      const time = paidDate ? paidDate.toLocaleTimeString('en-IN') : 'N/A';
      
      // Find the user associated with this flat
      const user = flatUserMap.get(payment.flatId);
      
      // Use user data if available, otherwise fall back to flat owner data
      const name = user?.name || payment.flat.ownerName;
      const email = user?.email || payment.flat.ownerEmail;
      const role = user?.role || 'N/A';
      
      return [
        date,
        time,
        name,
        email,
        payment.flat.flatNumber,
        role,
        `${monthNames[payment.maintenanceMonth.month - 1]} ${payment.maintenanceMonth.year}`,
        payment.amount.toString(),
        payment.status === 'PAID' ? 'Paid' : 'Unpaid',
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="payments-${month || 'all'}-${year || 'all'}.csv"`
    );
    res.send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ error: 'Failed to export payments' });
  }
};