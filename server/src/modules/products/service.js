import { prisma } from '../../config/database.js';
import { AppError } from '../../middleware/errorHandler.js';

export async function createProduct(data, companyId) {
  return prisma.product.create({
    data: { ...data, companyId },
    include: { category: true, variants: true },
  });
}

export async function updateProduct(id, data) {
  const product = await prisma.product.findUnique({ where: { id, deletedAt: null } });
  if (!product) throw new AppError('Product not found', 404);

  return prisma.product.update({
    where: { id },
    data,
    include: { category: true, variants: true },
  });
}

export async function deleteProduct(id) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found', 404);

  return prisma.product.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });
}

export async function getProduct(id) {
  const product = await prisma.product.findUnique({
    where: { id, deletedAt: null },
    include: {
      category: true,
      variants: { where: { deletedAt: null } },
      stockLevels: { include: { branch: true } },
      bundleParent: { include: { childProduct: true } },
      supplierProducts: { include: { supplier: true } },
    },
  });
  if (!product) throw new AppError('Product not found', 404);
  return product;
}

export async function listProducts(query, companyId) {
  const { page = '1', limit = '20', search, categoryId, isActive } = query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    companyId,
    deletedAt: null,
    ...(categoryId && { categoryId }),
    ...(isActive !== undefined && { isActive: isActive === 'true' }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        stockLevels: true,
        variants: { where: { deletedAt: null } },
      },
      orderBy: { name: 'asc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
}

export async function createVariant(productId, data) {
  const product = await prisma.product.findUnique({ where: { id: productId, deletedAt: null } });
  if (!product) throw new AppError('Product not found', 404);

  return prisma.productVariant.create({
    data: { ...data, productId },
  });
}

export async function createBundle(data, companyId) {
  const { name, sku, retailPrice, components } = data;

  // Calculate total cost from components
  let totalCost = 0;
  for (const comp of components) {
    const product = await prisma.product.findUnique({ where: { id: comp.productId } });
    if (!product) throw new AppError(`Product not found: ${comp.productId}`, 404);
    totalCost += Number(product.costPrice) * comp.quantity;
  }

  return prisma.$transaction(async (tx) => {
    const bundleProduct = await tx.product.create({
      data: {
        companyId,
        name,
        sku,
        costPrice: totalCost,
        retailPrice,
        isService: false,
        taxClass: 'standard',
      },
    });

    for (const comp of components) {
      await tx.bundle.create({
        data: {
          parentProductId: bundleProduct.id,
          childProductId: comp.productId,
          quantity: comp.quantity,
        },
      });
    }

    return tx.product.findUnique({
      where: { id: bundleProduct.id },
      include: { bundleParent: { include: { childProduct: true } } },
    });
  });
}

export async function importProducts(products, companyId) {
  const results = { created: 0, updated: 0, errors: [] };

  for (const row of products) {
    try {
      const existing = await prisma.product.findFirst({
        where: { sku: row.sku, companyId },
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: row.name,
            costPrice: parseFloat(row.costPrice) || 0,
            retailPrice: parseFloat(row.retailPrice) || 0,
            barcode: row.barcode || null,
            unitOfMeasure: row.unitOfMeasure || 'pcs',
            taxClass: row.taxClass || 'standard',
          },
        });
        results.updated++;
      } else {
        await prisma.product.create({
          data: {
            companyId,
            name: row.name,
            sku: row.sku,
            barcode: row.barcode || null,
            costPrice: parseFloat(row.costPrice) || 0,
            retailPrice: parseFloat(row.retailPrice) || 0,
            unitOfMeasure: row.unitOfMeasure || 'pcs',
            taxClass: row.taxClass || 'standard',
          },
        });
        results.created++;
      }
    } catch (err) {
      results.errors.push({ sku: row.sku, error: err.message });
    }
  }

  return results;
}

export async function exportProducts(companyId) {
  return prisma.product.findMany({
    where: { companyId, deletedAt: null },
    include: { category: true, stockLevels: true },
    orderBy: { name: 'asc' },
  });
}
