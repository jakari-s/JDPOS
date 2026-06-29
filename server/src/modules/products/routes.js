import { Router } from 'express';
import multer from 'multer';
import * as controller from './controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { createProductSchema, updateProductSchema, createVariantSchema, createBundleSchema } from './validation.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.get('/', controller.listProducts);
router.get('/export', controller.exportProducts);
router.get('/:id', controller.getProduct);
router.post('/', authorize('super_admin', 'admin'), validateBody(createProductSchema), controller.createProduct);
router.put('/:id', authorize('super_admin', 'admin'), validateBody(updateProductSchema), controller.updateProduct);
router.delete('/:id', authorize('super_admin', 'admin'), controller.deleteProduct);
router.post('/:id/variants', authorize('super_admin', 'admin'), validateBody(createVariantSchema), controller.createVariant);
router.post('/bundles', authorize('super_admin', 'admin'), validateBody(createBundleSchema), controller.createBundle);
router.post('/import', authorize('super_admin', 'admin'), upload.single('file'), controller.importProducts);

export default router;
