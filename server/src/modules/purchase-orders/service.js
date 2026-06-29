import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { generatePONumber } from '../../utils/generators.js';

export async function createPO(data, user) {
  const { supplierId, items, notes } = data;

  const poNumber = await generatePONumber();
  let subtotal = 0;
  const poItems = items.map((item) => {
    const lineTotal = item.quantityOrdered * item.unitCost;
    subtotal += lineTotal;
    return {
      productId: item.productId,
      quantityOrdered: item.quantityOrdered,
      unitCost: item.unitCost,
      lineTotal,
    };
  });

  return prisma.purchaseOrder.create({
    data: {
      branchId: user.branchId,
      supplierId,
      userId: user.id,
      poNumber,
      subtotal,
      total: subtotal,
      notes,
      items: { create: poItems },
    },
    include: { items: { include: { product: true } }, supplier: true },
  });
}

export async function getPO(id) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      items: { include: { product: true, grnItems: true } },
      supplier: true,
      grns: { include: { items: true } },
      user: { select: { id: true, name: true } },
      branch: true,
    },
  });
  if (!po) throw new AppError('Purchase order not found', 404);
  return po;
}

export async function listPOs(query, user) {
  const { page = '1', limit = '20', status, supplierId } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    branchId: user.role === 'super_admin' ? undefined : user.branchId,
    deletedAt: null,
    ...(status && { status }),
    ...(supplierId && { supplierId }),
  };

  const [pos, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: { supplier: true, items: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    data: pos,
    pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
  };
}

export async function updatePOStatus(id, status) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new AppError('Purchase order not found', 404);
  return prisma.purchaseOrder.update({ where: { id }, data: { status } });
}

export async function createGRN(data, user) {
  const { poId, items, notes } = data;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { items: true },
  });
  if (!po) throw new AppError('Purchase order not found', 404);

  return prisma.$transaction(async (tx) => {
    const grn = await tx.grn.create({
      data: {
        poId,
        branchId: user.branchId,
        userId: user.id,
        notes,
        items: { create: items },
      },
      include: { items: true },
    });

    // Update PO items received quantities and stock levels
    for (const item of items) {
      await tx.poItem.update({
        where: { id: item.poItemId },
        data: { quantityReceived: { increment: item.quantityReceived } },
      });

      // Update stock level
      await tx.stockLevel.upsert({
        where: { productId_branchId: { productId: item.productId, branchId: user.branchId } },
        create: { productId: item.productId, branchId: user.branchId, quantity: item.quantityReceived },
        update: { quantity: { increment: item.quantityReceived } },
      });

      // Create stock movement
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          branchId: user.branchId,
          type: 'grn',
          quantity: item.quantityReceived,
          unitCost: item.unitCost,
          referenceId: grn.id,
          referenceType: 'grn',
          userId: user.id,
        },
      });

      // Create stock batch
      await tx.stockBatch.create({
        data: {
          productId: item.productId,
          branchId: user.branchId,
          quantity: item.quantityReceived,
          costPrice: item.unitCost,
          supplierId: po.supplierId,
          grnId: grn.id,
        },
      });
    }

    // Update PO status
    const updatedPO = await tx.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });

    const allReceived = updatedPO.items.every((i) => i.quantityReceived >= i.quantityOrdered);
    const anyReceived = updatedPO.items.some((i) => i.quantityReceived > 0);

    await tx.purchaseOrder.update({
      where: { id: poId },
      data: { status: allReceived ? 'fully_received' : anyReceived ? 'partially_received' : po.status },
    });

    // Update supplier balance
    const totalCost = items.reduce((sum, i) => sum + i.quantityReceived * Number(i.unitCost), 0);
    await tx.supplier.update({
      where: { id: po.supplierId },
      data: { balance: { increment: totalCost } },
    });

    return grn;
  });
}
