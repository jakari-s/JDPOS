import { Router } from 'express';
import * as controller from './controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { openShiftSchema, closeShiftSchema, cashMovementSchema, eodSchema } from './validation.js';

const router = Router();
router.use(authenticate);

router.get('/', controller.listShifts);
router.get('/active', controller.getActiveShift);
router.get('/x-report', controller.getXReport);
router.get('/:id', controller.getShift);
router.post('/open', validateBody(openShiftSchema), controller.openShift);
router.post('/:id/close', validateBody(closeShiftSchema), controller.closeShift);
router.post('/:id/cash-movement', validateBody(cashMovementSchema), controller.addCashMovement);
router.post('/eod', authorize('super_admin', 'admin'), validateBody(eodSchema), controller.generateEod);

export default router;
