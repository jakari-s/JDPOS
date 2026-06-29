import { Router } from 'express';
import * as controller from './controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { createSupplierSchema, updateSupplierSchema, supplierPaymentSchema } from './validation.js';

const router = Router();
router.use(authenticate);

router.get('/', controller.listSuppliers);
router.get('/:id', controller.getSupplier);
router.post('/', authorize('super_admin', 'admin'), validateBody(createSupplierSchema), controller.createSupplier);
router.put('/:id', authorize('super_admin', 'admin'), validateBody(updateSupplierSchema), controller.updateSupplier);
router.delete('/:id', authorize('super_admin', 'admin'), controller.deleteSupplier);
router.post('/:id/payments', authorize('super_admin', 'admin'), validateBody(supplierPaymentSchema), controller.recordPayment);

export default router;
