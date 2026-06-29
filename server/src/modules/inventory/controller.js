import * as inventoryService from './service.js';
import { createAuditLog } from '../../utils/audit.js';

export async function getStockLevels(req, res, next) {
  try {
    const result = await inventoryService.getStockLevels(req.query, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function adjustStock(req, res, next) {
  try {
    const result = await inventoryService.adjustStock(req.body, req.user);
    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: 'stock_adjusted',
      entity: 'stock_level',
      entityId: result.id,
      newValue: req.body,
      ipAddress: req.ip,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createTransfer(req, res, next) {
  try {
    const transfer = await inventoryService.createTransfer(req.body, req.user);
    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: 'transfer_created',
      entity: 'stock_transfer',
      entityId: transfer.id,
      ipAddress: req.ip,
    });
    res.status(201).json(transfer);
  } catch (err) {
    next(err);
  }
}

export async function updateTransfer(req, res, next) {
  try {
    const transfer = await inventoryService.updateTransfer(req.params.id, req.body, req.user);
    await createAuditLog({
      userId: req.user.id,
      branchId: req.user.branchId,
      action: `transfer_${req.body.action}`,
      entity: 'stock_transfer',
      entityId: transfer.id,
      ipAddress: req.ip,
    });
    res.json(transfer);
  } catch (err) {
    next(err);
  }
}

export async function getStockMovements(req, res, next) {
  try {
    const result = await inventoryService.getStockMovements(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getExpiringStock(req, res, next) {
  try {
    const days = parseInt(req.query.days) || 30;
    const result = await inventoryService.getExpiringStock(days, req.query.branchId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
