import { Router } from 'express';
import * as controller from './controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { adjustStockSchema, createTransferSchema, updateTransferSchema } from './validation.js';

const router = Router();

router.use(authenticate);

router.get('/', controller.getStockLevels);
router.get('/movements', controller.getStockMovements);
router.get('/expiring', controller.getExpiringStock);
router.post('/adjust', authorize('super_admin', 'admin', 'supervisor'), validateBody(adjustStockSchema), controller.adjustStock);
router.post('/transfer', authorize('super_admin', 'admin', 'supervisor'), validateBody(createTransferSchema), controller.createTransfer);
router.put('/transfer/:id', authorize('super_admin', 'admin', 'supervisor'), validateBody(updateTransferSchema), controller.updateTransfer);

export default router;
