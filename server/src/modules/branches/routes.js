import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const branchSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { companyId: req.user.companyId, deletedAt: null },
      include: { _count: { select: { users: true, sales: true } } },
      orderBy: { name: 'asc' },
    });
    res.json(branches);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const branch = await prisma.branch.findUnique({
      where: { id: req.params.id },
      include: {
        users: { select: { id: true, name: true, role: true, isActive: true } },
        _count: { select: { sales: true, shifts: true } },
      },
    });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    res.json(branch);
  } catch (err) { next(err); }
});

router.post('/', authorize('super_admin'), validateBody(branchSchema), async (req, res, next) => {
  try {
    const branch = await prisma.branch.create({
      data: { ...req.body, companyId: req.user.companyId },
    });
    res.status(201).json(branch);
  } catch (err) { next(err); }
});

router.put('/:id', authorize('super_admin', 'admin'), validateBody(branchSchema.partial()), async (req, res, next) => {
  try {
    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(branch);
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('super_admin'), async (req, res, next) => {
  try {
    await prisma.branch.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), isActive: false },
    });
    res.json({ message: 'Branch deleted' });
  } catch (err) { next(err); }
});

export default router;
