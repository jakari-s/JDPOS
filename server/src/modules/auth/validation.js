import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const pinLoginSchema = z.object({
  pin: z.string().length(4, 'PIN must be 4 digits'),
  branchId: z.string().uuid('Valid branch ID required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});
