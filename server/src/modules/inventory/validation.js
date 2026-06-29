import { z } from 'zod';

export const adjustStockSchema = z.object({
  productId: z.string().uuid(),
  branchId: z.string().uuid(),
  type: z.enum(['adjustment_in', 'adjustment_out', 'write_off']),
  quantity: z.number().int().positive(),
  unitCost: z.number().min(0).optional(),
  reason: z.string().min(1),
  supplierId: z.string().uuid().optional(),
  expiryDate: z.string().optional(),
});

export const createTransferSchema = z.object({
  fromBranchId: z.string().uuid(),
  toBranchId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  notes: z.string().optional(),
});

export const updateTransferSchema = z.object({
  action: z.enum(['approve', 'reject', 'receive', 'cancel']),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantityReceived: z.number().int().min(0),
  })).optional(),
});
