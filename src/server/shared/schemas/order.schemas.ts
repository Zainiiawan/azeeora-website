import { z } from 'zod';

const shippingAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone number is required'),
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
});

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        product: z.string().min(1),
        variant: z.string().optional(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1)
    .optional(),
  shippingAddress: shippingAddressSchema,
  billingAddress: shippingAddressSchema.optional(),
  paymentMethod: z.enum(['cod', 'jazzcash', 'easypaisa']),
  couponCode: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'pending',
    'pending_confirmation',
    'confirmed',
    'processing',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'refunded',
    'return_requested',
    'returned',
  ]),
  message: z.string().optional(),
  trackingNumber: z.string().optional(),
  courierName: z.string().max(100).optional(),
  trackingUrl: z.string().url().optional().or(z.literal('')),
  estimatedDelivery: z.string().datetime().optional().or(z.string().optional()),
  dispatchedAt: z.string().datetime().optional().or(z.string().optional()),
  location: z.string().optional(),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  cartTotal: z.number().min(0),
});

export const submitPaymentProofSchema = z.object({
  transactionId: z.string().min(3, 'Transaction ID is required').max(64),
  paidAmount: z.number().positive('Paid amount must be greater than 0'),
  screenshotUrl: z.string().min(8, 'Screenshot is required'),
  screenshotPublicId: z.string().optional(),
  note: z.string().max(500).optional(),
});

export const verifyPaymentSchema = z.object({
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
export type SubmitPaymentProofInput = z.infer<typeof submitPaymentProofSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
