import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  pin: z.string().length(4).optional(),
  role: z.enum(['super_admin', 'admin', 'supervisor', 'cashier']),
  branchId: z.string().uuid(),
  permissions: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  pin: z.string().length(4).optional(),
  role: z.enum(['super_admin', 'admin', 'supervisor', 'cashier']).optional(),
  branchId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(z.string()).optional(),
});
