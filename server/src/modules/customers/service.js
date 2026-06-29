import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { generateAccountNumber } from '../../utils/generators.js';

export async function createCustomer(data, companyId) {
  return prisma.customer.create({
    data: {
      ...data,
      companyId,
      accountNumber: generateAccountNumber(),
    },
  });
}

export async function updateCustomer(id, data) {
  const customer = await prisma.customer.findUnique({ where: { id, deletedAt: null } });
  if (!customer) throw new AppError('Customer not found', 404);
  return prisma.customer.update({ where: { id }, data });
}

export async function deleteCustomer(id) {
  return prisma.customer.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}

export async function getCustomer(id) {
  const customer = await prisma.customer.findUnique({
    where: { id, deletedAt: null },
    include: {
      loyaltyTransactions: { orderBy: { createdAt: 'desc' }, take: 50 },
      creditTransactions: { orderBy: { createdAt: 'desc' }, take: 50 },
    },
  });
  if (!customer) throw new AppError('Customer not found', 404);
  return customer;
}

export async function listCustomers(query, companyId) {
  const { page = '1', limit = '20', search, customerType } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    companyId,
    deletedAt: null,
    ...(customerType && { customerType }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { accountNumber: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data: customers,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  };
}

export async function getCustomerPurchaseHistory(customerId, query) {
  const { page = '1', limit = '20' } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where: { customerId, deletedAt: null },
      include: {
        items: { include: { product: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.sale.count({ where: { customerId, deletedAt: null } }),
  ]);

  return {
    data: sales,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  };
}

export async function recordCreditPayment(customerId, data) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError('Customer not found', 404);

  if (data.amount > Number(customer.creditBalance)) {
    throw new AppError('Payment amount exceeds outstanding balance');
  }

  return prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customerId },
      data: { creditBalance: { decrement: data.amount } },
    });

    return tx.creditTransaction.create({
      data: {
        customerId,
        type: 'payment',
        amount: data.amount,
        notes: data.notes,
      },
    });
  });
}

export async function redeemPoints(customerId, points) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError('Customer not found', 404);

  if (points > customer.loyaltyPoints) {
    throw new AppError('Insufficient loyalty points');
  }

  return prisma.$transaction(async (tx) => {
    await tx.customer.update({
      where: { id: customerId },
      data: { loyaltyPoints: { decrement: points } },
    });

    return tx.loyaltyTransaction.create({
      data: {
        customerId,
        type: 'redeem',
        points: -points,
        description: `Redeemed ${points} points`,
      },
    });
  });
}
