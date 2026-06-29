import * as productService from './service.js';
import { createAuditLog } from '../../utils/audit.js';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct(req.body, req.user.companyId);
    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: 'product_created',
      entity: 'product',
      entityId: product.id,
      newValue: { name: product.name, sku: product.sku },
      ipAddress: req.ip,
    });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const oldProduct = await productService.getProduct(req.params.id);
    const product = await productService.updateProduct(req.params.id, req.body);
    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: 'product_updated',
      entity: 'product',
      entityId: product.id,
      oldValue: { name: oldProduct.name, retailPrice: oldProduct.retailPrice },
      newValue: { name: product.name, retailPrice: product.retailPrice },
      ipAddress: req.ip,
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id);
    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: 'product_deleted',
      entity: 'product',
      entityId: req.params.id,
      ipAddress: req.ip,
    });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getProduct(req, res, next) {
  try {
    const product = await productService.getProduct(req.params.id);
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function listProducts(req, res, next) {
  try {
    const result = await productService.listProducts(req.query, req.user.companyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createVariant(req, res, next) {
  try {
    const variant = await productService.createVariant(req.params.id, req.body);
    res.status(201).json(variant);
  } catch (err) {
    next(err);
  }
}

export async function createBundle(req, res, next) {
  try {
    const bundle = await productService.createBundle(req.body, req.user.companyId);
    res.status(201).json(bundle);
  } catch (err) {
    next(err);
  }
}

export async function importProducts(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file required' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const result = await productService.importProducts(records, req.user.companyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function exportProducts(req, res, next) {
  try {
    const products = await productService.exportProducts(req.user.companyId);
    const csvData = products.map((p) => ({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      category: p.category?.name || '',
      costPrice: Number(p.costPrice),
      retailPrice: Number(p.retailPrice),
      wholesalePrice: p.wholesalePrice ? Number(p.wholesalePrice) : '',
      unitOfMeasure: p.unitOfMeasure,
      taxClass: p.taxClass,
      isService: p.isService,
      isActive: p.isActive,
    }));

    const csv = stringify(csvData, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=products.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
