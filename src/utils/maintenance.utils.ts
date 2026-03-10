import prisma from "../config/databases";

export async function createMaintenanceYear(year: number) {
  const months = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    year
  }));

  await prisma.maintenanceMonth.createMany({
    data: months,
    skipDuplicates: true
  });
}