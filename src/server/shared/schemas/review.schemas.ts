import { z } from 'zod';

// ==========================================
// Review Schemas
// ==========================================

export const createReviewSchema = z.object({
  product: z.string().min(1, 'Product ID is required'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z.string().min(1, 'Review title is required').max(100),
  body: z.string().min(10, 'Review must be at least 10 characters').max(500, 'Review cannot exceed 500 characters'),
  guestName: z.string().optional(),
  guestEmail: z.string().email('Invalid email address').optional(),
  images: z.array(z.string().url()).optional(),
});

export const updateReviewModerationSchema = z.object({
  isApproved: z.boolean(),
  moderationNote: z.string().optional(),
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewModerationInput = z.infer<typeof updateReviewModerationSchema>;
