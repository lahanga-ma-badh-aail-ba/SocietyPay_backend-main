import { Request, Response } from "express";
import prisma from "../config/databases";

export const createMaintenanceMonth = async (req: Request, res: Response) => {
  const { month, year } = req.body;

  const existing = await prisma.maintenanceMonth.findFirst({
    where: { month, year },
  });

  if (existing) {
    return res.status(400).json({ message: "Maintenance month already exists" });
  }

  const maintenanceMonth = await prisma.maintenanceMonth.create({
    data: { month, year },
  });

  res.status(201).json(maintenanceMonth);
};

export const getCurrentMaintenanceMonth = async (_req: Request, res: Response) => {
  const now = new Date();

  const maintenanceMonth = await prisma.maintenanceMonth.findFirst({
    where: {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    },
  });

  res.json(maintenanceMonth);
};
