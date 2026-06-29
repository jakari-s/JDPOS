import * as customerService from './service.js';
import { createAuditLog } from '../../utils/audit.js';

export async function createCustomer(req, res, next) {
  try {
    const customer = await customerService.createCustomer(req.body, req.user.companyId);
    await createAuditLog({
      userId: req.user.id, branchId: req.user.branchId,
      action: 'customer_created', entity: 'customer', entityId: customer.id,
      newValue: { name: customer.name }, ipAddress: req.ip,
    });
    res.status(201).json(customer);
  } catch (err) { next(err); }
}

export async function updateCustomer(req, res, next) {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    res.json(customer);
  } catch (err) { next(err); }
}

export async function deleteCustomer(req, res, next) {
  try {
    await customerService.deleteCustomer(req.params.id);
    res.json({ message: 'Customer deleted' });
  } catch (err) { next(err); }
}

export async function getCustomer(req, res, next) {
  try {
    const customer = await customerService.getCustomer(req.params.id);
    res.json(customer);
  } catch (err) { next(err); }
}

export async function listCustomers(req, res, next) {
  try {
    const result = await customerService.listCustomers(req.query, req.user.companyId);
    res.json(result);
  } catch (err) { next(err); }
}

export async function getCustomerPurchaseHistory(req, res, next) {
  try {
    const result = await customerService.getCustomerPurchaseHistory(req.params.id, req.query);
    res.json(result);
  } catch (err) { next(err); }
}

export async function recordCreditPayment(req, res, next) {
  try {
    const result = await customerService.recordCreditPayment(req.params.id, req.body);
    res.json(result);
  } catch (err) { next(err); }
}

export async function redeemPoints(req, res, next) {
  try {
    const result = await customerService.redeemPoints(req.params.id, req.body.points);
    res.json(result);
  } catch (err) { next(err); }
}
