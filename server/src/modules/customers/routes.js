import { Router } from 'express';
import * as controller from './controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { createCustomerSchema, updateCustomerSchema, creditPaymentSchema, redeemPointsSchema } from './validation.js';

const router = Router();
router.use(authenticate);

router.get('/', controller.listCustomers);
router.get('/:id', controller.getCustomer);
router.get('/:id/purchases', controller.getCustomerPurchaseHistory);
router.post('/', validateBody(createCustomerSchema), controller.createCustomer);
router.put('/:id', validateBody(updateCustomerSchema), controller.updateCustomer);
router.delete('/:id', controller.deleteCustomer);
router.post('/:id/credit-payment', validateBody(creditPaymentSchema), controller.recordCreditPayment);
router.post('/:id/redeem-points', validateBody(redeemPointsSchema), controller.redeemPoints);

export default router;
