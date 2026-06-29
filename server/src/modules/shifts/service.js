import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { startOfDay, endOfDay, toDecimal } from '../../utils/index.js';

export async function openShift(data, user) {
  const existingShift = await prisma.shift.findFirst({
    where: { userId: user.id, status: 'open' },
  });
  if (existingShift) throw new AppError('You already have an open shift');

  return prisma.shift.create({
    data: {
      branchId: user.branchId,
      userId: user.id,
      openingFloat: data.openingFloat,
    },
    include: { user: { select: { id: true, name: true } } },
  });
}

export async function closeShift(shiftId, data, user) {
  const shift = await prisma.shift.findUnique({
    where: { id: shiftId },
    include: {
      sales: { include: { payments: true } },
      cashMovements: true,
    },
  });

  if (!shift) throw new AppError('Shift not found', 404);
  if (shift.status !== 'open') throw new AppError('Shift is already closed');
  if (shift.userId !== user.id && !['admin', 'supervisor', 'super_admin'].includes(user.role)) {
    throw new AppError('Not authorized to close this shift', 403);
  }

  // Calculate expected cash
  const cashSales = shift.sales
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => {
      const cashPayments = s.payments.filter((p) => p.method === 'cash');
      return sum + cashPayments.reduce((pSum, p) => pSum + Number(p.amount), 0);
    }, 0);

  const drops = shift.cashMovements
    .filter((m) => m.type === 'drop')
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const payouts = shift.cashMovements
    .filter((m) => m.type === 'payout')
    .reduce((sum, m) => sum + Number(m.amount), 0);

  const expectedCash = toDecimal(Number(shift.openingFloat) + cashSales - drops - payouts);
  const variance = toDecimal(data.countedCash - expectedCash);

  return prisma.shift.update({
    where: { id: shiftId },
    data: {
      closedAt: new Date(),
      expectedCash,
      countedCash: data.countedCash,
      variance,
      varianceNote: data.varianceNote,
      status: 'closed',
    },
    include: {
      user: { select: { id: true, name: true } },
      sales: { include: { payments: true } },
      cashMovements: true,
    },
  });
}

export async function getShift(id) {
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true } },
      sales: { include: { payments: true, items: true } },
      cashMovements: true,
      branch: true,
    },
  });
  if (!shift) throw new AppError('Shift not found', 404);
  return shift;
}

export async function getActiveShift(userId) {
  return prisma.shift.findFirst({
    where: { userId, status: 'open' },
    include: {
      sales: { include: { payments: true } },
      cashMovements: true,
    },
  });
}

export async function listShifts(query, user) {
  const { page = '1', limit = '20', status, userId: filterUserId, startDate, endDate } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    branchId: user.role === 'super_admin' ? undefined : user.branchId,
    ...(status && { status }),
    ...(filterUserId && { userId: filterUserId }),
    ...(startDate && endDate && {
      openedAt: { gte: new Date(startDate), lte: new Date(endDate) },
    }),
  };

  const [shifts, total] = await Promise.all([
    prisma.shift.findMany({
      where,
      include: { user: { select: { id: true, name: true } } },
      orderBy: { openedAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.shift.count({ where }),
  ]);

  return {
    data: shifts,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  };
}

export async function addCashMovement(shiftId, data) {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
  if (!shift || shift.status !== 'open') throw new AppError('Active shift not found', 404);

  return prisma.cashMovement.create({
    data: { shiftId, ...data },
  });
}

export async function generateEodReport(date, branchId, closedBy) {
  const dayStart = startOfDay(new Date(date));
  const dayEnd = endOfDay(new Date(date));

  const existing = await prisma.eodReport.findUnique({
    where: { branchId_date: { branchId, date: dayStart } },
  });
  if (existing) throw new AppError('EOD report already exists for this date');

  const sales = await prisma.sale.findMany({
    where: {
      branchId,
      createdAt: { gte: dayStart, lte: dayEnd },
      status: { in: ['completed', 'partially_refunded'] },
    },
    include: { payments: true },
  });

  const refunds = await prisma.refund.findMany({
    where: {
      sale: { branchId },
      createdAt: { gte: dayStart, lte: dayEnd },
      status: 'completed',
    },
  });

  const totalSales = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalRefunds = refunds.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalTax = sales.reduce((sum, s) => sum + Number(s.taxAmount), 0);

  let cashSales = 0, mpesaSales = 0, creditSales = 0, cardSales = 0;
  for (const sale of sales) {
    for (const payment of sale.payments) {
      const amount = Number(payment.amount);
      switch (payment.method) {
        case 'cash': cashSales += amount; break;
        case 'mpesa': mpesaSales += amount; break;
        case 'credit': creditSales += amount; break;
        case 'card': cardSales += amount; break;
      }
    }
  }

  // Close all open shifts for this branch on this date
  await prisma.shift.updateMany({
    where: {
      branchId,
      status: 'open',
      openedAt: { gte: dayStart, lte: dayEnd },
    },
    data: { status: 'closed', closedAt: new Date() },
  });

  return prisma.eodReport.create({
    data: {
      branchId,
      date: dayStart,
      totalSales: toDecimal(totalSales),
      totalRefunds: toDecimal(totalRefunds),
      totalTax: toDecimal(totalTax),
      cashSales: toDecimal(cashSales),
      mpesaSales: toDecimal(mpesaSales),
      creditSales: toDecimal(creditSales),
      cardSales: toDecimal(cardSales),
      closedBy,
      report: {
        salesCount: sales.length,
        refundsCount: refunds.length,
        netSales: toDecimal(totalSales - totalRefunds),
      },
    },
  });
}

export async function getXReport(branchId) {
  const dayStart = startOfDay(new Date());
  const dayEnd = endOfDay(new Date());

  const sales = await prisma.sale.findMany({
    where: {
      branchId,
      createdAt: { gte: dayStart, lte: dayEnd },
      status: { in: ['completed', 'partially_refunded'] },
    },
    include: { payments: true },
  });

  const totalSales = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalTax = sales.reduce((sum, s) => sum + Number(s.taxAmount), 0);

  let cashSales = 0, mpesaSales = 0, creditSales = 0, cardSales = 0;
  for (const sale of sales) {
    for (const payment of sale.payments) {
      const amount = Number(payment.amount);
      switch (payment.method) {
        case 'cash': cashSales += amount; break;
        case 'mpesa': mpesaSales += amount; break;
        case 'credit': creditSales += amount; break;
        case 'card': cardSales += amount; break;
      }
    }
  }

  return {
    date: new Date().toISOString(),
    branchId,
    salesCount: sales.length,
    totalSales: toDecimal(totalSales),
    totalTax: toDecimal(totalTax),
    cashSales: toDecimal(cashSales),
    mpesaSales: toDecimal(mpesaSales),
    creditSales: toDecimal(creditSales),
    cardSales: toDecimal(cardSales),
    isInterim: true,
  };
}
