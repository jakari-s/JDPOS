import { Router } from 'express';
import * as controller from './controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';

const router = Router();
router.use(authenticate);
router.use(authorize('super_admin', 'admin', 'supervisor'));

router.get('/sales', controller.getSalesReport);
router.get('/inventory', controller.getInventoryReport);
router.get('/cashier', controller.getCashierReport);
router.get('/profit', controller.getProfitReport);
router.get('/eod/:date', controller.getEodReport);
router.get('/kra', controller.getKraReport);
router.get('/accounts-receivable', controller.getAccountsReceivable);
router.get('/accounts-payable', controller.getAccountsPayable);
router.get('/:type/export', controller.exportReport);

export default router;
