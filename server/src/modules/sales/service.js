import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';
import { generateReceiptNumber, calculateVAT, toDecimal, createAuditLog } from '../../utils/index.js';
import bcrypt from 'bcrypt';

export async function createSale(data, user) {
  const { items, payments, customerId, shiftId, discountAmount = 0, notes, isOffline } = data;

  return prisma.$transaction(async (tx) => {
    let subtotal = 0;
    let totalTax = 0;
    const saleItems = [];

    for (const item of items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId, deletedAt: null },
      });
      if (!product) throw new AppError(`Product not found: ${item.productId}`, 404);

      const lineSubtotal = toDecimal(item.unitPrice * item.quantity - item.discountAmount);
      const { vat } = calculateVAT(lineSubtotal, product.taxClass);

      subtotal += lineSubtotal;
      totalTax += vat;

      saleItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        taxAmount: vat,
        lineTotal: lineSubtotal,
      });

      // Deduct stock for non-service items
      if (!product.isService) {
        const stockLevel = await tx.stockLevel.findUnique({
          where: { productId_branchId: { productId: item.productId, branchId: user.branchId } },
        });

        if (stockLevel) {
          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: { quantity: { decrement: item.quantity } },
          });
        }

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            branchId: user.branchId,
            type: 'sale',
            quantity: -item.quantity,
            unitCost: product.costPrice,
            userId: user.id,
          },
        });
      }
    }

    const total = toDecimal(subtotal - discountAmount);
    const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
    if (toDecimal(totalPayments) < total) {
      throw new AppError('Payment amount is less than sale total');
    }

    const sale = await tx.sale.create({
      data: {
        branchId: user.branchId,
        userId: user.id,
        customerId: customerId || null,
        shiftId: shiftId || null,
        status: 'completed',
        subtotal,
        discountAmount,
        taxAmount: totalTax,
        total,
        notes,
        receiptNumber: generateReceiptNumber(),
        isOffline: isOffline || false,
        items: { create: saleItems },
        payments: {
          create: payments.map((p) => ({
            method: p.method,
            amount: p.amount,
            mpesaCode: p.mpesaCode || null,
            mpesaPhone: p.mpesaPhone || null,
            reference: p.reference || null,
            status: 'completed',
          })),
        },
      },
      include: { items: { include: { product: true } }, payments: true, customer: true },
    });

    // Handle credit payment
    const creditPayment = payments.find((p) => p.method === 'credit');
    if (creditPayment && customerId) {
      await tx.customer.update({
        where: { id: customerId },
        data: { creditBalance: { increment: creditPayment.amount } },
      });
      await tx.creditTransaction.create({
        data: {
          customerId,
          type: 'sale',
          amount: creditPayment.amount,
          saleId: sale.id,
        },
      });
    }

    // Update customer loyalty points and last purchase
    if (customerId) {
      const company = await tx.company.findFirst({
        where: { branches: { some: { id: user.branchId } } },
      });
      if (company) {
        const pointsEarned = Math.floor(Number(total) * Number(company.loyaltyRate));
        if (pointsEarned > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: {
              loyaltyPoints: { increment: pointsEarned },
              lastPurchaseAt: new Date(),
            },
          });
          await tx.loyaltyTransaction.create({
            data: {
              customerId,
              type: 'earn',
              points: pointsEarned,
              referenceId: sale.id,
              description: `Points earned from sale ${sale.receiptNumber}`,
            },
          });
        }
      }
    }

    return sale;
  });
}

export async function getSale(id) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: { include: { product: true, variant: true } },
      payments: true,
      customer: true,
      user: { select: { id: true, name: true, email: true } },
      branch: true,
      refunds: { include: { items: true } },
    },
  });
  if (!sale) throw new AppError('Sale not found', 404);
  return sale;
}

export async function listSales(query, user) {
  const { page = '1', limit = '20', startDate, endDate, status, cashierId, customerId } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    branchId: user.role === 'super_admin' ? undefined : user.branchId,
    deletedAt: null,
    ...(status && { status }),
    ...(cashierId && { userId: cashierId }),
    ...(customerId && { customerId }),
    ...(startDate && endDate && {
      createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
    }),
  };

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        items: { include: { product: true } },
        payments: true,
        customer: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    data: sales,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

export async function createRefund(saleId, data, user) {
  const { approverId, approverPin, reason, items: refundItems } = data;

  // Verify approver PIN
  const approver = await prisma.user.findUnique({ where: { id: approverId } });
  if (!approver || !approver.pin) throw new AppError('Invalid approver', 400);
  const validPin = await bcrypt.compare(approverPin, approver.pin);
  if (!validPin) throw new AppError('Invalid approver PIN', 401);
  if (!['admin', 'supervisor', 'super_admin'].includes(approver.role)) {
    throw new AppError('Approver must be a supervisor or admin', 403);
  }

  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: true },
  });
  if (!sale) throw new AppError('Sale not found', 404);

  return prisma.$transaction(async (tx) => {
    let totalRefundAmount = 0;

    const refundItemsData = [];
    for (const item of refundItems) {
      const saleItem = sale.items.find((si) => si.id === item.saleItemId);
      if (!saleItem) throw new AppError(`Sale item not found: ${item.saleItemId}`, 404);
      if (item.quantity > saleItem.quantity) {
        throw new AppError(`Refund quantity exceeds sale quantity for item ${item.saleItemId}`);
      }

      const itemAmount = toDecimal(Number(saleItem.unitPrice) * item.quantity);
      totalRefundAmount += itemAmount;

      refundItemsData.push({
        saleItemId: item.saleItemId,
        quantity: item.quantity,
        amount: itemAmount,
        returnToStock: item.returnToStock,
      });

      // Return stock if requested
      if (item.returnToStock) {
        const product = await tx.product.findUnique({ where: { id: saleItem.productId } });
        if (product && !product.isService) {
          await tx.stockLevel.updateMany({
            where: { productId: saleItem.productId, branchId: sale.branchId },
            data: { quantity: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              productId: saleItem.productId,
              branchId: sale.branchId,
              type: 'return',
              quantity: item.quantity,
              referenceId: saleId,
              referenceType: 'refund',
              userId: user.id,
            },
          });
        }
      }
    }

    const refund = await tx.refund.create({
      data: {
        saleId,
        userId: user.id,
        approverId,
        reason,
        amount: totalRefundAmount,
        status: 'completed',
        items: { create: refundItemsData },
      },
      include: { items: true },
    });

    // Update sale status
    const allItemsRefunded = sale.items.every((si) => {
      const refundItem = refundItems.find((ri) => ri.saleItemId === si.id);
      return refundItem && refundItem.quantity >= si.quantity;
    });

    await tx.sale.update({
      where: { id: saleId },
      data: { status: allItemsRefunded ? 'refunded' : 'partially_refunded' },
    });

    return refund;
  });
}

export async function parkSale(data, user) {
  const { items, customerId, notes } = data;

  let subtotal = 0;
  let totalTax = 0;
  const saleItems = [];

  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new AppError(`Product not found: ${item.productId}`, 404);

    const lineSubtotal = toDecimal(item.unitPrice * item.quantity - (item.discountAmount || 0));
    const { vat } = calculateVAT(lineSubtotal, product.taxClass);
    subtotal += lineSubtotal;
    totalTax += vat;

    saleItems.push({
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount || 0,
      taxAmount: vat,
      lineTotal: lineSubtotal,
    });
  }

  return prisma.sale.create({
    data: {
      branchId: user.branchId,
      userId: user.id,
      customerId: customerId || null,
      status: 'parked',
      subtotal,
      discountAmount: 0,
      taxAmount: totalTax,
      total: subtotal,
      notes: notes || 'Parked sale',
      receiptNumber: generateReceiptNumber(),
      items: { create: saleItems },
    },
    include: { items: { include: { product: true } }, customer: true },
  });
}

export async function recallParkedSale(saleId) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: { include: { product: true } }, customer: true },
  });

  if (!sale || sale.status !== 'parked') {
    throw new AppError('Parked sale not found', 404);
  }

  return sale;
}
