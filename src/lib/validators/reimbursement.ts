import { z } from 'zod';

export const createReimbursementSchema = z.object({
  amount: z.number().positive('金额必须大于零'),
  categoryId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式无效'),
  description: z.string().min(1, '请填写描述').max(500, '描述不能超过500字'),
  receiptPath: z.string().optional(),
});

export const approveReimbursementSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().max(500).default(''),
});
