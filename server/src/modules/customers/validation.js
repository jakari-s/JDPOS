import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  customerType: z.enum(['retail', 'wholesale', 'vip']).default('retail'),
  creditLimit: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const creditPaymentSchema = z.object({
  amount: z.number().positive(),
  notes: z.string().optional(),
});

export const redeemPointsSchema = z.object({
  points: z.number().int().positive(),
});
