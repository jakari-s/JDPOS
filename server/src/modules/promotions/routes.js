import { Router } from 'express';
import { prisma } from '../../config/database.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const promotionSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['percentage', 'flat', 'buy_x_get_y', 'category']),
  value: z.number().min(0).optional(),
  buyQuantity: z.number().int().min(1).optional(),
  getQuantity: z.number().int().min(1).optional(),
  categoryId: z.string().uuid().optional().nullable(),
  couponCode: z.string().optional().nullable(),
  usageLimit: z.number().int().min(0).optional().nullable(),
  priority: z.number().int().default(0),
  startDate: z.string(),
  endDate: z.string(),
  productIds: z.array(z.string().uuid()).optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const promotions = await prisma.promotion.findMany({
      where: { companyId: req.user.companyId },
      include: { products: { include: { product: { select: { id: true, name: true } } } } },
      orderBy: { priority: 'desc' },
    });
    res.json(promotions);
  } catch (err) { next(err); }
});

router.get('/active', async (req, res, next) => {
  try {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        companyId: req.user.companyId,
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: { products: { include: { product: true } } },
      orderBy: { priority: 'desc' },
    });
    res.json(promotions);
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const promotion = await prisma.promotion.findUnique({
      where: { id: req.params.id },
      include: { products: { include: { product: true } } },
    });
    if (!promotion) return res.status(404).json({ error: 'Promotion not found' });
    res.json(promotion);
  } catch (err) { next(err); }
});

router.post('/', authorize('super_admin', 'admin'), validateBody(promotionSchema), async (req, res, next) => {
  try {
    const { productIds, ...data } = req.body;
    const promotion = await prisma.promotion.create({
      data: {
        ...data,
        companyId: req.user.companyId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        ...(productIds && {
          products: {
            create: productIds.map((pid) => ({ productId: pid })),
          },
        }),
      },
      include: { products: { include: { product: true } } },
    });
    res.status(201).json(promotion);
  } catch (err) { next(err); }
});

router.put('/:id', authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { productIds, ...data } = req.body;
    const updateData = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);

    const promotion = await prisma.promotion.update({
      where: { id: req.params.id },
      data: updateData,
      include: { products: { include: { product: true } } },
    });
    res.json(promotion);
  } catch (err) { next(err); }
});

router.delete('/:id', authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    await prisma.promotionProduct.deleteMany({ where: { promotionId: req.params.id } });
    await prisma.promotion.delete({ where: { id: req.params.id } });
    res.json({ message: 'Promotion deleted' });
  } catch (err) { next(err); }
});

router.post('/validate-coupon', async (req, res, next) => {
  try {
    const { code } = req.body;
    const now = new Date();
    const promotion = await prisma.promotion.findUnique({
      where: { couponCode: code },
      include: { products: true },
    });

    if (!promotion || !promotion.isActive) {
      return res.status(404).json({ error: 'Invalid coupon code' });
    }
    if (promotion.startDate > now || promotion.endDate < now) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }
    if (promotion.usageLimit && promotion.usageCount >= promotion.usageLimit) {
      return res.status(400).json({ error: 'Coupon usage limit reached' });
    }

    res.json(promotion);
  } catch (err) { next(err); }
});

export default router;
