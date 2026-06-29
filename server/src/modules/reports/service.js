import { prisma } from '../../config/database.js';
import { startOfDay, endOfDay, toDecimal } from '../../utils/index.js';

export async function getSalesReport(query, user) {
  const { startDate, endDate, groupBy = 'day', branchId } = query;
  const start = startOfDay(new Date(startDate || new Date()));
  const end = endOfDay(new Date(endDate || new Date()));

  const targetBranchId = user.role === 'super_admin' ? branchId : user.branchId;

  const sales = await prisma.sale.findMany({
    where: {
      ...(targetBranchId && { branchId: targetBranchId }),
      createdAt: { gte: start, lte: end },
      status: { in: ['completed', 'partially_refunded'] },
      deletedAt: null,
    },
    include: {
      items: { include: { product: { include: { category: true } } } },
      payments: true,
      user: { select: { id: true, name: true } },
      customer: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const summary = {
    totalSales: toDecimal(sales.reduce((sum, s) => sum + Number(s.total), 0)),
    totalTax: toDecimal(sales.reduce((sum, s) => sum + Number(s.taxAmount), 0)),
    totalDiscount: toDecimal(sales.reduce((sum, s) => sum + Number(s.discountAmount), 0)),
    salesCount: sales.length,
    averageTransaction: sales.length ? toDecimal(sales.reduce((sum, s) => sum + Number(s.total), 0) / sales.length) : 0,
  };

  // Sales by product
  const productMap = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      const key = item.productId;
      if (!productMap[key]) {
        productMap[key] = {
          productId: item.productId,
          name: item.product.name,
          sku: item.product.sku,
          quantity: 0,
          revenue: 0,
          cost: 0,
        };
      }
      productMap[key].quantity += item.quantity;
      productMap[key].revenue += Number(item.lineTotal);
      productMap[key].cost += Number(item.product.costPrice) * item.quantity;
    }
  }

  const salesByProduct = Object.values(productMap).map((p) => ({
    ...p,
    grossProfit: toDecimal(p.revenue - p.cost),
    margin: p.revenue > 0 ? toDecimal(((p.revenue - p.cost) / p.revenue) * 100) : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  // Sales by category
  const categoryMap = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      const catName = item.product.category?.name || 'Uncategorized';
      if (!categoryMap[catName]) categoryMap[catName] = { category: catName, revenue: 0, count: 0 };
      categoryMap[catName].revenue += Number(item.lineTotal);
      categoryMap[catName].count += item.quantity;
    }
  }
  const salesByCategory = Object.values(categoryMap).sort((a, b) => b.revenue - a.revenue);

  // Sales by payment method
  const paymentMap = {};
  for (const sale of sales) {
    for (const payment of sale.payments) {
      if (!paymentMap[payment.method]) paymentMap[payment.method] = { method: payment.method, total: 0, count: 0 };
      paymentMap[payment.method].total += Number(payment.amount);
      paymentMap[payment.method].count += 1;
    }
  }
  const salesByPaymentMethod = Object.values(paymentMap);

  // Sales by cashier
  const cashierMap = {};
  for (const sale of sales) {
    const key = sale.userId;
    if (!cashierMap[key]) cashierMap[key] = { userId: key, name: sale.user.name, total: 0, count: 0 };
    cashierMap[key].total += Number(sale.total);
    cashierMap[key].count += 1;
  }
  const salesByCashier = Object.values(cashierMap).sort((a, b) => b.total - a.total);

  // Hourly heatmap
  const hourlyMap = Array.from({ length: 24 }, (_, i) => ({ hour: i, sales: 0, revenue: 0 }));
  for (const sale of sales) {
    const hour = new Date(sale.createdAt).getHours();
    hourlyMap[hour].sales += 1;
    hourlyMap[hour].revenue += Number(sale.total);
  }

  return {
    summary,
    salesByProduct,
    salesByCategory,
    salesByPaymentMethod,
    salesByCashier,
    hourlyHeatmap: hourlyMap,
    sales,
  };
}

export async function getInventoryReport(query, user) {
  const targetBranchId = user.role === 'super_admin' ? query.branchId : user.branchId;

  const stockLevels = await prisma.stockLevel.findMany({
    where: targetBranchId ? { branchId: targetBranchId } : {},
    include: {
      product: { select: { id: true, name: true, sku: true, costPrice: true, retailPrice: true, minStockLevel: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { product: { name: 'asc' } },
  });

  const totalStockValue = stockLevels.reduce((sum, sl) => sum + sl.quantity * Number(sl.product.costPrice), 0);
  const totalRetailValue = stockLevels.reduce((sum, sl) => sum + sl.quantity * Number(sl.product.retailPrice), 0);
  const lowStockItems = stockLevels.filter((sl) => sl.quantity <= sl.product.minStockLevel);
  const outOfStockItems = stockLevels.filter((sl) => sl.quantity <= 0);

  return {
    summary: {
      totalProducts: stockLevels.length,
      totalStockValue: toDecimal(totalStockValue),
      totalRetailValue: toDecimal(totalRetailValue),
      lowStockCount: lowStockItems.length,
      outOfStockCount: outOfStockItems.length,
    },
    stockLevels,
    lowStockItems,
    outOfStockItems,
  };
}

export async function getCashierReport(query, user) {
  const { startDate, endDate, userId } = query;
  const start = startOfDay(new Date(startDate || new Date()));
  const end = endOfDay(new Date(endDate || new Date()));

  const where = {
    createdAt: { gte: start, lte: end },
    status: { in: ['completed', 'partially_refunded'] },
    ...(userId && { userId }),
    ...(user.role !== 'super_admin' && { branchId: user.branchId }),
  };

  const sales = await prisma.sale.findMany({
    where,
    include: {
      user: { select: { id: true, name: true } },
      payments: true,
    },
  });

  const cashierMap = {};
  for (const sale of sales) {
    const key = sale.userId;
    if (!cashierMap[key]) {
      cashierMap[key] = {
        userId: key,
        name: sale.user.name,
        totalSales: 0,
        salesCount: 0,
        cashTotal: 0,
        mpesaTotal: 0,
        creditTotal: 0,
      };
    }
    cashierMap[key].totalSales += Number(sale.total);
    cashierMap[key].salesCount += 1;
    for (const payment of sale.payments) {
      switch (payment.method) {
        case 'cash': cashierMap[key].cashTotal += Number(payment.amount); break;
        case 'mpesa': cashierMap[key].mpesaTotal += Number(payment.amount); break;
        case 'credit': cashierMap[key].creditTotal += Number(payment.amount); break;
      }
    }
  }

  return Object.values(cashierMap).map((c) => ({
    ...c,
    averageTransaction: c.salesCount ? toDecimal(c.totalSales / c.salesCount) : 0,
  }));
}

export async function getProfitReport(query, user) {
  const { startDate, endDate, branchId } = query;
  const start = startOfDay(new Date(startDate || new Date()));
  const end = endOfDay(new Date(endDate || new Date()));

  const targetBranchId = user.role === 'super_admin' ? branchId : user.branchId;

  const sales = await prisma.sale.findMany({
    where: {
      ...(targetBranchId && { branchId: targetBranchId }),
      createdAt: { gte: start, lte: end },
      status: { in: ['completed', 'partially_refunded'] },
    },
    include: { items: { include: { product: true } } },
  });

  let totalRevenue = 0;
  let totalCost = 0;
  const productProfits = {};

  for (const sale of sales) {
    for (const item of sale.items) {
      const revenue = Number(item.lineTotal);
      const cost = Number(item.product.costPrice) * item.quantity;
      totalRevenue += revenue;
      totalCost += cost;

      if (!productProfits[item.productId]) {
        productProfits[item.productId] = {
          name: item.product.name,
          revenue: 0,
          cost: 0,
        };
      }
      productProfits[item.productId].revenue += revenue;
      productProfits[item.productId].cost += cost;
    }
  }

  const refunds = await prisma.refund.findMany({
    where: {
      createdAt: { gte: start, lte: end },
      status: 'completed',
    },
  });
  const totalRefunds = refunds.reduce((sum, r) => sum + Number(r.amount), 0);

  return {
    summary: {
      totalRevenue: toDecimal(totalRevenue),
      totalCost: toDecimal(totalCost),
      grossProfit: toDecimal(totalRevenue - totalCost),
      grossMargin: totalRevenue > 0 ? toDecimal(((totalRevenue - totalCost) / totalRevenue) * 100) : 0,
      totalRefunds: toDecimal(totalRefunds),
      netProfit: toDecimal(totalRevenue - totalCost - totalRefunds),
    },
    byProduct: Object.values(productProfits).map((p) => ({
      ...p,
      profit: toDecimal(p.revenue - p.cost),
      margin: p.revenue > 0 ? toDecimal(((p.revenue - p.cost) / p.revenue) * 100) : 0,
    })).sort((a, b) => b.profit - a.profit),
  };
}

export async function getEodReport(date, branchId) {
  const dayStart = startOfDay(new Date(date));
  const report = await prisma.eodReport.findUnique({
    where: { branchId_date: { branchId, date: dayStart } },
    include: { branch: true },
  });

  if (!report) {
    return null;
  }
  return report;
}

export async function getKraReport(query) {
  const { startDate, endDate, status } = query;
  const where = {
    ...(startDate && endDate && {
      createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
    }),
    ...(status && { status }),
  };

  return prisma.etimsSubmission.findMany({
    where,
    include: {
      sale: { select: { id: true, receiptNumber: true, total: true, createdAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getAccountsReceivable(companyId) {
  return prisma.customer.findMany({
    where: { companyId, creditBalance: { gt: 0 }, deletedAt: null },
    select: {
      id: true, name: true, phone: true, accountNumber: true,
      creditBalance: true, creditLimit: true, customerType: true,
      creditTransactions: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
    orderBy: { creditBalance: 'desc' },
  });
}

export async function getAccountsPayable(companyId) {
  return prisma.supplier.findMany({
    where: { companyId, balance: { gt: 0 }, deletedAt: null },
    select: {
      id: true, name: true, phone: true, balance: true, paymentTerms: true,
      payments: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
    orderBy: { balance: 'desc' },
  });
}
