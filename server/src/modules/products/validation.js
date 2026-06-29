import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  barcode: z.string().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  costPrice: z.number().min(0),
  retailPrice: z.number().min(0),
  wholesalePrice: z.number().min(0).optional().nullable(),
  vipPrice: z.number().min(0).optional().nullable(),
  unitOfMeasure: z.string().default('pcs'),
  taxClass: z.enum(['standard', 'zero_rated', 'exempt']).default('standard'),
  isService: z.boolean().default(false),
  minStockLevel: z.number().int().min(0).default(0),
  reorderQty: z.number().int().min(0).default(0),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createVariantSchema = z.object({
  attributes: z.record(z.string()),
  sku: z.string().min(1),
  barcode: z.string().optional().nullable(),
  costPrice: z.number().min(0),
  retailPrice: z.number().min(0),
  stockQty: z.number().int().min(0).default(0),
});

export const createBundleSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  retailPrice: z.number().min(0),
  components: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
});
