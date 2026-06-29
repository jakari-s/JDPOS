import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function getStockLevels(query, user) {
  const { branchId, productId, lowStock, page = '1', limit = '50' } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    ...(branchId ? { branchId } : user.role !== 'super_admin' ? { branchId: user.branchId } : {}),
    ...(productId && { productId }),
  };

  let stockLevels = await prisma.stockLevel.findMany({
    where,
    include: {
      product: { select: { id: true, name: true, sku: true, barcode: true, minStockLevel: true, costPrice: true, retailPrice: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { product: { name: 'asc' } },
    skip,
    take: parseInt(limit),
  });

  if (lowStock === 'true') {
    stockLevels = stockLevels.filter((sl) => sl.quantity <= sl.product.minStockLevel);
  }

  const total = await prisma.stockLevel.count({ where });

  return {
    data: stockLevels,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  };
}

export async function adjustStock(data, user) {
  const { productId, branchId, type, quantity, unitCost, reason, supplierId, expiryDate } = data;

  return prisma.$transaction(async (tx) => {
    const stockLevel = await tx.stockLevel.upsert({
      where: { productId_branchId: { productId, branchId } },
      create: { productId, branchId, quantity: 0 },
      update: {},
    });

    const adjustedQty = type === 'adjustment_in' ? quantity : -quantity;

    if (stockLevel.quantity + adjustedQty < 0) {
      throw new AppError('Insufficient stock for this adjustment');
    }

    const updated = await tx.stockLevel.update({
      where: { id: stockLevel.id },
      data: { quantity: { increment: adjustedQty } },
    });

    await tx.stockMovement.create({
      data: {
        productId,
        branchId,
        type,
        quantity: adjustedQty,
        unitCost: unitCost || null,
        notes: reason,
        userId: user.id,
        referenceType: 'adjustment',
      },
    });

    if (type === 'adjustment_in' && expiryDate) {
      await tx.stockBatch.create({
        data: {
          productId,
          branchId,
          quantity,
          costPrice: unitCost || 0,
          expiryDate: new Date(expiryDate),
          supplierId: supplierId || null,
        },
      });
    }

    return updated;
  });
}

export async function createTransfer(data, user) {
  const { fromBranchId, toBranchId, items, notes } = data;

  if (fromBranchId === toBranchId) {
    throw new AppError('Cannot transfer to the same branch');
  }

  return prisma.stockTransfer.create({
    data: {
      fromBranchId,
      toBranchId,
      requestedBy: user.id,
      notes,
      items: {
        create: items.map((item) => ({
          productId: item.productId,
          quantityRequested: item.quantity,
        })),
      },
    },
    include: { items: true, fromBranch: true, toBranch: true },
  });
}

export async function updateTransfer(transferId, data, user) {
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: transferId },
    include: { items: true },
  });

  if (!transfer) throw new AppError('Transfer not found', 404);

  return prisma.$transaction(async (tx) => {
    switch (data.action) {
      case 'approve': {
        if (transfer.status !== 'requested') throw new AppError('Transfer cannot be approved');

        // Deduct stock from source branch
        for (const item of transfer.items) {
          await tx.stockLevel.updateMany({
            where: { productId: item.productId, branchId: transfer.fromBranchId },
            data: { quantity: { decrement: item.quantityRequested } },
          });
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              branchId: transfer.fromBranchId,
              type: 'transfer_out',
              quantity: -item.quantityRequested,
              referenceId: transferId,
              referenceType: 'transfer',
              userId: user.id,
            },
          });
        }

        return tx.stockTransfer.update({
          where: { id: transferId },
          data: { status: 'in_transit', approvedBy: user.id },
          include: { items: true },
        });
      }

      case 'receive': {
        if (transfer.status !== 'in_transit') throw new AppError('Transfer not in transit');

        for (const item of transfer.items) {
          const receivedItem = data.items?.find((i) => i.productId === item.productId);
          const qty = receivedItem ? receivedItem.quantityReceived : item.quantityRequested;

          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { quantityReceived: qty },
          });

          await tx.stockLevel.upsert({
            where: { productId_branchId: { productId: item.productId, branchId: transfer.toBranchId } },
            create: { productId: item.productId, branchId: transfer.toBranchId, quantity: qty },
            update: { quantity: { increment: qty } },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              branchId: transfer.toBranchId,
              type: 'transfer_in',
              quantity: qty,
              referenceId: transferId,
              referenceType: 'transfer',
              userId: user.id,
            },
          });
        }

        return tx.stockTransfer.update({
          where: { id: transferId },
          data: { status: 'received' },
          include: { items: true },
        });
      }

      case 'cancel': {
        if (!['requested', 'approved'].includes(transfer.status)) {
          throw new AppError('Transfer cannot be cancelled');
        }
        return tx.stockTransfer.update({
          where: { id: transferId },
          data: { status: 'cancelled' },
          include: { items: true },
        });
      }

      default:
        throw new AppError('Invalid action');
    }
  });
}

export async function getStockMovements(query) {
  const { productId, branchId, type, startDate, endDate, page = '1', limit = '50' } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    ...(productId && { productId }),
    ...(branchId && { branchId }),
    ...(type && { type }),
    ...(startDate && endDate && {
      createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
    }),
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    data: movements,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  };
}

export async function getExpiringStock(daysThreshold = 30, branchId) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

  return prisma.stockBatch.findMany({
    where: {
      expiryDate: { lte: thresholdDate, gte: new Date() },
      quantity: { gt: 0 },
      ...(branchId && { branchId }),
    },
    include: {
      product: { select: { id: true, name: true, sku: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { expiryDate: 'asc' },
  });
}
