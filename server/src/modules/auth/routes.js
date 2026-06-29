import { Router } from 'express';
import * as controller from './controller.js';
import { validateBody } from '../../middleware/validate.js';
import { authLimiter } from '../../middleware/rateLimiter.js';
import { loginSchema, pinLoginSchema } from './validation.js';

const router = Router();

router.post('/login', authLimiter, validateBody(loginSchema), controller.login);
router.post('/pin-login', authLimiter, validateBody(pinLoginSchema), controller.pinLogin);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);

export default router;
