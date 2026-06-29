import { z } from 'zod';

export const openShiftSchema = z.object({
  openingFloat: z.number().min(0),
});

export const closeShiftSchema = z.object({
  countedCash: z.number().min(0),
  varianceNote: z.string().optional(),
});

export const cashMovementSchema = z.object({
  type: z.enum(['drop', 'payout']),
  amount: z.number().positive(),
  reason: z.string().min(1),
  approverId: z.string().uuid().optional(),
});

export const eodSchema = z.object({
  date: z.string(),
});
