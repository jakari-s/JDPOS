import { z } from 'zod';

export const createSaleSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  shiftId: z.string().uuid().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional().nullable(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
    discountAmount: z.number().min(0).default(0),
  })).min(1, 'At least one item is required'),
  payments: z.array(z.object({
    method: z.enum(['cash', 'mpesa', 'credit', 'card', 'cheque']),
    amount: z.number().positive(),
    mpesaCode: z.string().optional(),
    mpesaPhone: z.string().optional(),
    reference: z.string().optional(),
  })).min(1, 'At least one payment is required'),
  discountAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
  isOffline: z.boolean().default(false),
});

export const refundSchema = z.object({
  approverId: z.string().uuid(),
  approverPin: z.string().length(4),
  reason: z.string().min(1, 'Refund reason is required'),
  items: z.array(z.object({
    saleItemId: z.string().uuid(),
    quantity: z.number().int().positive(),
    returnToStock: z.boolean().default(true),
  })).min(1, 'At least one item is required'),
});

export const listSalesSchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
  cashierId: z.string().optional(),
  customerId: z.string().optional(),
});

export const parkSaleSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().optional().nullable(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().positive(),
    discountAmount: z.number().min(0).default(0),
  })).min(1),
  notes: z.string().optional(),
});
