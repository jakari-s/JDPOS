import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function createSupplier(data, companyId) {
  return prisma.supplier.create({ data: { ...data, companyId } });
}

export async function updateSupplier(id, data) {
  const supplier = await prisma.supplier.findUnique({ where: { id, deletedAt: null } });
  if (!supplier) throw new AppError('Supplier not found', 404);
  return prisma.supplier.update({ where: { id }, data });
}

export async function deleteSupplier(id) {
  return prisma.supplier.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
}

export async function getSupplier(id) {
  const supplier = await prisma.supplier.findUnique({
    where: { id, deletedAt: null },
    include: {
      purchaseOrders: { orderBy: { createdAt: 'desc' }, take: 20 },
      payments: { orderBy: { createdAt: 'desc' }, take: 20 },
      supplierProducts: { include: { product: { select: { id: true, name: true, sku: true } } } },
    },
  });
  if (!supplier) throw new AppError('Supplier not found', 404);
  return supplier;
}

export async function listSuppliers(query, companyId) {
  const { page = '1', limit = '20', search } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    companyId,
    deletedAt: null,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip, take: parseInt(limit) }),
    prisma.supplier.count({ where }),
  ]);

  return {
    data: suppliers,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  };
}

export async function recordPayment(supplierId, data, userId) {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  if (!supplier) throw new AppError('Supplier not found', 404);

  return prisma.$transaction(async (tx) => {
    await tx.supplier.update({
      where: { id: supplierId },
      data: { balance: { decrement: data.amount } },
    });

    return tx.supplierPayment.create({
      data: { supplierId, ...data, userId },
    });
  });
}
