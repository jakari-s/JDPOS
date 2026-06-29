import * as supplierService from './service.js';

export async function createSupplier(req, res, next) {
  try {
    const supplier = await supplierService.createSupplier(req.body, req.user.companyId);
    res.status(201).json(supplier);
  } catch (err) { next(err); }
}

export async function updateSupplier(req, res, next) {
  try {
    const supplier = await supplierService.updateSupplier(req.params.id, req.body);
    res.json(supplier);
  } catch (err) { next(err); }
}

export async function deleteSupplier(req, res, next) {
  try {
    await supplierService.deleteSupplier(req.params.id);
    res.json({ message: 'Supplier deleted' });
  } catch (err) { next(err); }
}

export async function getSupplier(req, res, next) {
  try {
    const supplier = await supplierService.getSupplier(req.params.id);
    res.json(supplier);
  } catch (err) { next(err); }
}

export async function listSuppliers(req, res, next) {
  try {
    const result = await supplierService.listSuppliers(req.query, req.user.companyId);
    res.json(result);
  } catch (err) { next(err); }
}

export async function recordPayment(req, res, next) {
  try {
    const result = await supplierService.recordPayment(req.params.id, req.body, req.user.id);
    res.json(result);
  } catch (err) { next(err); }
}
