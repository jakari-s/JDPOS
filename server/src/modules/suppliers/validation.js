import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional(),
  pin: z.string().optional(),
  paymentTerms: z.enum(['COD', 'Net7', 'Net14', 'Net30', 'Net60']).default('COD'),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const supplierPaymentSchema = z.object({
  amount: z.number().positive(),
  method: z.enum(['cash', 'bank_transfer', 'mpesa', 'cheque']),
  reference: z.string().optional(),
  notes: z.string().optional(),
});
