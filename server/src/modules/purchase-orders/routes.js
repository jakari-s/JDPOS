import { Router } from 'express';
import * as controller from './controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { createPOSchema, updatePOStatusSchema, createGRNSchema } from './validation.js';

const router = Router();
router.use(authenticate);

router.get('/', controller.listPOs);
router.get('/:id', controller.getPO);
router.post('/', authorize('super_admin', 'admin'), validateBody(createPOSchema), controller.createPO);
router.put('/:id/status', authorize('super_admin', 'admin'), validateBody(updatePOStatusSchema), controller.updatePOStatus);
router.post('/grn', authorize('super_admin', 'admin', 'supervisor'), validateBody(createGRNSchema), controller.createGRN);

export default router;
