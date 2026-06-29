import { Router } from 'express';
import * as controller from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { createSaleSchema, refundSchema, parkSaleSchema } from './validation.js';

const router = Router();

router.use(authenticate);

router.post('/', validateBody(createSaleSchema), controller.createSale);
router.get('/', controller.listSales);
router.get('/parked', controller.getParkedSales);
router.get('/:id', controller.getSale);
router.post('/:id/refund', validateBody(refundSchema), controller.createRefund);
router.post('/park', validateBody(parkSaleSchema), controller.parkSale);
router.get('/parked/:id/recall', controller.recallParkedSale);

export default router;
