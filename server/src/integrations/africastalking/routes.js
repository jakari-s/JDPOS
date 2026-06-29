import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { sendSMS, sendBulkSMS } from './sms.js';
import { prisma } from '../../config/database.js';
import { validateBody } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const sendSmsSchema = z.object({
  phone: z.string().min(1),
  message: z.string().min(1).max(480),
});

const bulkSmsSchema = z.object({
  recipients: z.array(z.string().min(1)).min(1),
  message: z.string().min(1).max(480),
});

router.post('/send', authorize('super_admin', 'admin'), validateBody(sendSmsSchema), async (req, res, next) => {
  try {
    const result = await sendSMS(req.body.phone, req.body.message);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/bulk', authorize('super_admin', 'admin'), validateBody(bulkSmsSchema), async (req, res, next) => {
  try {
    const results = await sendBulkSMS(req.body.recipients, req.body.message);
    res.json({ results });
  } catch (err) { next(err); }
});

router.get('/logs', authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { page = '1', limit = '20', status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = status ? { status } : {};
    const [logs, total] = await Promise.all([
      prisma.smsLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.smsLog.count({ where }),
    ]);

    res.json({
      data: logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { next(err); }
});

// Delivery report callback from Africa's Talking
router.post('/delivery-report', async (req, res) => {
  try {
    const { id, status } = req.body;
    if (id) {
      await prisma.smsLog.updateMany({
        where: { providerMessageId: id },
        data: { status: status === 'Success' ? 'delivered' : 'failed' },
      });
    }
    res.json({ status: 'ok' });
  } catch {
    res.json({ status: 'ok' });
  }
});

export default router;
