import { z } from 'zod';

// ==========================================
// Coupon Schemas
// ==========================================

export const createCouponSchema = z.object({
  code: z.string().min(3, 'Code must be at least 3 characters').max(20).toUpperCase(),
  type: z.enum(['percentage', 'fixed', 'buy_x_get_y', 'free_shipping']),
  value: z.number().min(0, 'Value must be positive'),
  minOrderAmount: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  buyXGetY: z.object({
    buyQuantity: z.number().int().min(1),
    getQuantity: z.number().int().min(1),
    getProductIds: z.array(z.string()).optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
  }).optional(),
  applicableProducts: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional(),
  usageLimit: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional().default(true),
});

export const createDiscountSchema = z.object({
  name: z.string().min(1, 'Discount name is required'),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().min(0, 'Value must be positive'),
  applicableProducts: z.array(z.string()).optional(),
  applicableCategories: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().optional().default(true),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;
