import { api } from './axios';

export interface ProductImage {
  url: string;
  publicId?: string;
  alt?: string;
  isMain?: boolean;
}

export interface ProductDiscount {
  type: 'percentage' | 'fixed';
  value: number;
  startDate?: string;
  endDate?: string;
}

export interface ProductVariant {
  name?: string;
  value?: string;
  sku?: string;
  price?: number;
  compareAtPrice?: number;
  stock?: number;
  isActive?: boolean;
  images?: ProductImage[];
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  sku?: string;
  images: ProductImage[];
  basePrice: number;
  compareAtPrice?: number;
  rating: number;
  reviewCount: number;
  discount?: ProductDiscount;
  isFeatured: boolean;
  isComingSoon?: boolean;
  launchDate?: string;
  stock: number;
  description?: string;
  seoContent?: string;
  shortDescription?: string;
  variants?: ProductVariant[];
  category?: string | { _id: string; name: string; slug: string };
  brand?: string | { _id: string; name: string; slug: string };
  video?: {
    url: string;
    publicId?: string;
  };
  isActive?: boolean;
  soldCount?: number;
  tags?: string[];
}

export interface ProductPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface ProductListParams {
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  search?: string;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'bestselling' | 'name_asc';
  page?: number;
  limit?: number;
  isFeatured?: boolean;
  inStock?: boolean;
}

export interface CreateProductData {
  name: string;
  sku: string;
  category: string;
  brand?: string;
  price: number;
  stock: number;
  status: 'Active' | 'Inactive';
  isComingSoon?: boolean;
  launchDate?: string;
  description?: string;
  images?: ProductImage[];
  discount?: ProductDiscount | null;
}

export type UpdateProductData = Partial<CreateProductData>;

/** Map admin form fields → API schema (basePrice, isActive, ObjectId refs) */
const toApiPayload = (data: CreateProductData | UpdateProductData): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};

  if (data.name !== undefined) payload.name = data.name;
  if (data.sku !== undefined) payload.sku = data.sku;
  if (data.category !== undefined) payload.category = data.category;
  if (data.brand !== undefined && data.brand) payload.brand = data.brand;
  if (data.price !== undefined) payload.basePrice = data.price;
  if (data.stock !== undefined) payload.stock = data.stock;
  if (data.status !== undefined) payload.isActive = data.status === 'Active';
  if (data.isComingSoon !== undefined) payload.isComingSoon = data.isComingSoon;
  if (data.launchDate !== undefined) payload.launchDate = data.launchDate;
  if (data.description !== undefined) {
    payload.description =
      data.description.length >= 10
        ? data.description
        : `${data.description} — Premium AZEEORA COSMETICS product.`;
  }
  if (data.discount !== undefined) {
    payload.discount = data.discount;
  }

  if (data.images && data.images.length > 0) {
    payload.images = data.images.map((img, i) => ({
      url: img.url,
      publicId: img.publicId || `product-${Date.now()}-${i}`,
      alt: img.alt || data.name || 'Product image',
      isMain: img.isMain ?? i === 0,
    }));
  }

  return payload;
};

export const productApi = {
  getAll: async (
    params?: ProductListParams
  ): Promise<{ products: Product[]; pagination: ProductPagination }> => {
    const response = await api.get('/products', { params: { ...params, limit: params?.limit ?? 100 } });
    return response.data.data;
  },

  getBySlug: async (slug: string): Promise<Product> => {
    const response = await api.get(`/products/${slug}`);
    return response.data.data;
  },

  getById: async (id: string): Promise<Product> => {
    // The backend uses /products/:slug, but slug can also be an ID if mongoose.isValidObjectId matches,
    // or we can just create a specific endpoint /api/products/id/:id on backend.
    // The backend `GET /api/products/:slug` does:
    // `const isMongoId = mongoose.isValidObjectId(slug);`
    // `const query = isMongoId ? { _id: slug } : { slug };`
    // So we can just use getBySlug for ID as well!
    const response = await api.get(`/products/${id}`);
    return response.data.data;
  },

  create: async (data: CreateProductData): Promise<Product> => {
    if (!data.images || data.images.length === 0) {
      throw new Error('At least one product image is required');
    }
    const payload = toApiPayload({
      ...data,
      description: data.description || `${data.name} — Luxury beauty by AZEEORA COSMETICS.`,
    });
    const response = await api.post('/products', payload);
    return response.data.data;
  },

  update: async (productId: string, data: UpdateProductData): Promise<Product> => {
    const payload = toApiPayload(data);
    const response = await api.put(`/products/${productId}`, payload);
    return response.data.data;
  },

  delete: async (productId: string): Promise<void> => {
    await api.delete(`/products/${productId}`);
  },

  autocomplete: async (
    search: string,
    limit = 8
  ): Promise<{ items: Array<{ _id: string; name: string; slug: string }> }> => {
    const response = await api.get('/products/autocomplete', { params: { search, limit } });
    return response.data.data;
  },
};
