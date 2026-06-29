import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const categorySchema = z.object({
  name: z.string().min(1),
  parentId: z.string().uuid().optional().nullable(),
});

router.get('/', async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { companyId: req.user.companyId, deletedAt: null },
      include: {
        children: { where: { deletedAt: null } },
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: {
        children: { where: { deletedAt: null } },
        products: { where: { deletedAt: null }, take: 20 },
      },
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) { next(err); }
});

router.post('/', authorize('super_admin', 'admin'), validateBody(categorySchema), async (req, res, next) => {
  try {
    const category = await prisma.category.create({
      data: { ...req.body, companyId: req.user.companyId },
    });
    res.status(201).json(category);
  } catch (err) { next(err); }
});

router.put('/:id', authorize('super_admin', 'admin'), validateBody(categorySchema.partial()), async (req, res, next) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(category);
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    await prisma.category.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.json({ message: 'Category deleted' });
  } catch (err) { next(err); }
});

export default router;
