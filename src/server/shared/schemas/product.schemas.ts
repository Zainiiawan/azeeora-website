import { z } from 'zod';

// ==========================================
// Product Schemas
// ==========================================

const productImageSchema = z.object({
  url: z.string().url(),
  publicId: z.string(),
  alt: z.string().optional(),
  isMain: z.boolean().optional(),
});

const productVariantSchema = z.object({
  name: z.string().min(1, 'Variant name is required'),
  value: z.string().min(1, 'Variant value is required'),
  sku: z.string().min(1, 'SKU is required'),
  price: z.number().min(0, 'Price must be positive'),
  compareAtPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0, 'Stock must be non-negative'),
  images: z.array(productImageSchema).optional(),
  isActive: z.boolean().default(true),
});

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  shortDescription: z.string().max(500).optional(),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  images: z.array(productImageSchema).min(1, 'At least one image is required'),
  video: z
    .object({
      url: z.string().url(),
      publicId: z.string().min(1),
    })
    .optional(),
  variants: z.array(productVariantSchema).optional().default([]),
  basePrice: z.number().min(0, 'Price must be positive'),
  compareAtPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0, 'Stock must be non-negative'),
  lowStockThreshold: z.number().int().min(0).default(10),
  tags: z.array(z.string()).optional().default([]),
  attributes: z.record(z.string()).optional().default({}),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  isComingSoon: z.boolean().optional().default(false),
  launchDate: z.string().optional(),
  discount: z.object({
    type: z.enum(['percentage', 'fixed']),
    value: z.number().min(0),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).nullable().optional(),
  seo: z.object({
    metaTitle: z.string().max(60).optional(),
    metaDescription: z.string().max(160).optional(),
    metaKeywords: z.array(z.string()).optional(),
    canonicalUrl: z.string().url().optional(),
  }).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).optional(),
  image: productImageSchema.optional(),
  isActive: z.boolean().optional().default(true),
});

export const createBrandSchema = z.object({
  name: z.string().min(1, 'Brand name is required').max(100),
  description: z.string().max(500).optional(),
  logo: productImageSchema.optional(),
  website: z.string().url().optional(),
  isActive: z.boolean().optional().default(true),
});

export const productFilterSchema = z.object({
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  tags: z.string().optional(),
  inStock: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'rating', 'newest', 'bestselling', 'name_asc']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(12),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
