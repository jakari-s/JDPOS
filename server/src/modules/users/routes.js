import { Router } from 'express';
import * as controller from './controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { createUserSchema, updateUserSchema } from './validation.js';

const router = Router();
router.use(authenticate);

router.get('/me', controller.getMe);
router.get('/', authorize('super_admin', 'admin'), controller.listUsers);
router.get('/:id', authorize('super_admin', 'admin'), controller.getUser);
router.post('/', authorize('super_admin', 'admin'), validateBody(createUserSchema), controller.createUser);
router.put('/:id', authorize('super_admin', 'admin'), validateBody(updateUserSchema), controller.updateUser);
router.delete('/:id', authorize('super_admin', 'admin'), controller.deleteUser);

export default router;
