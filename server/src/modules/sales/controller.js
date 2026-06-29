import * as salesService from './service.js';
import { createAuditLog } from '../../utils/audit.js';

export async function createSale(req, res, next) {
  try {
    const sale = await salesService.createSale(req.body, req.user);
    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: 'sale_created',
      entity: 'sale',
      entityId: sale.id,
      newValue: { total: sale.total, receiptNumber: sale.receiptNumber },
      ipAddress: req.ip,
    });
    res.status(201).json(sale);
  } catch (err) {
    next(err);
  }
}

export async function listSales(req, res, next) {
  try {
    const result = await salesService.listSales(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSale(req, res, next) {
  try {
    const sale = await salesService.getSale(req.params.id);
    res.json(sale);
  } catch (err) {
    next(err);
  }
}

export async function createRefund(req, res, next) {
  try {
    const refund = await salesService.createRefund(req.params.id, req.body, req.user);
    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: 'refund_created',
      entity: 'refund',
      entityId: refund.id,
      newValue: { saleId: req.params.id, amount: refund.amount, reason: refund.reason },
      ipAddress: req.ip,
    });
    res.status(201).json(refund);
  } catch (err) {
    next(err);
  }
}

export async function parkSale(req, res, next) {
  try {
    const sale = await salesService.parkSale(req.body, req.user);
    res.status(201).json(sale);
  } catch (err) {
    next(err);
  }
}

export async function getParkedSales(req, res, next) {
  try {
    const result = await salesService.listSales({ ...req.query, status: 'parked' }, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function recallParkedSale(req, res, next) {
  try {
    const sale = await salesService.recallParkedSale(req.params.id);
    res.json(sale);
  } catch (err) {
    next(err);
  }
}
