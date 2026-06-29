import { z } from 'zod';

export const createPOSchema = z.object({
  supplierId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantityOrdered: z.number().int().positive(),
    unitCost: z.number().min(0),
  })).min(1),
  notes: z.string().optional(),
});

export const updatePOStatusSchema = z.object({
  status: z.enum(['sent', 'cancelled']),
});

export const createGRNSchema = z.object({
  poId: z.string().uuid(),
  items: z.array(z.object({
    poItemId: z.string().uuid(),
    productId: z.string().uuid(),
    quantityReceived: z.number().int().min(0),
    unitCost: z.number().min(0),
  })).min(1),
  notes: z.string().optional(),
});
