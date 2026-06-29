import * as shiftService from './service.js';

export async function openShift(req, res, next) {
  try {
    const shift = await shiftService.openShift(req.body, req.user);
    res.status(201).json(shift);
  } catch (err) { next(err); }
}

export async function closeShift(req, res, next) {
  try {
    const shift = await shiftService.closeShift(req.params.id, req.body, req.user);
    res.json(shift);
  } catch (err) { next(err); }
}

export async function getShift(req, res, next) {
  try {
    const shift = await shiftService.getShift(req.params.id);
    res.json(shift);
  } catch (err) { next(err); }
}

export async function getActiveShift(req, res, next) {
  try {
    const shift = await shiftService.getActiveShift(req.user.id);
    res.json(shift);
  } catch (err) { next(err); }
}

export async function listShifts(req, res, next) {
  try {
    const result = await shiftService.listShifts(req.query, req.user);
    res.json(result);
  } catch (err) { next(err); }
}

export async function addCashMovement(req, res, next) {
  try {
    const movement = await shiftService.addCashMovement(req.params.id, req.body);
    res.status(201).json(movement);
  } catch (err) { next(err); }
}

export async function generateEod(req, res, next) {
  try {
    const report = await shiftService.generateEodReport(
      req.body.date, req.user.branchId, req.user.id
    );
    res.status(201).json(report);
  } catch (err) { next(err); }
}

export async function getXReport(req, res, next) {
  try {
    const report = await shiftService.getXReport(req.user.branchId);
    res.json(report);
  } catch (err) { next(err); }
}
