import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { retryFailedSubmissions } from './etims.js';
import { prisma } from '../../config/database.js';

const router = Router();
router.use(authenticate);

router.get('/submissions', authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = status ? { status } : {};
    const [submissions, total] = await Promise.all([
      prisma.etimsSubmission.findMany({
        where,
        include: { sale: { select: { id: true, receiptNumber: true, total: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.etimsSubmission.count({ where }),
    ]);

    res.json({
      data: submissions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) { next(err); }
});

router.post('/retry', authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const results = await retryFailedSubmissions();
    res.json({ results });
  } catch (err) { next(err); }
});

export default router;
