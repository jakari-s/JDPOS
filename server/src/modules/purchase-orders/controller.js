import * as poService from './service.js';

export async function createPO(req, res, next) {
  try {
    const po = await poService.createPO(req.body, req.user);
    res.status(201).json(po);
  } catch (err) { next(err); }
}

export async function getPO(req, res, next) {
  try {
    const po = await poService.getPO(req.params.id);
    res.json(po);
  } catch (err) { next(err); }
}

export async function listPOs(req, res, next) {
  try {
    const result = await poService.listPOs(req.query, req.user);
    res.json(result);
  } catch (err) { next(err); }
}

export async function updatePOStatus(req, res, next) {
  try {
    const po = await poService.updatePOStatus(req.params.id, req.body.status);
    res.json(po);
  } catch (err) { next(err); }
}

export async function createGRN(req, res, next) {
  try {
    const grn = await poService.createGRN(req.body, req.user);
    res.status(201).json(grn);
  } catch (err) { next(err); }
}
