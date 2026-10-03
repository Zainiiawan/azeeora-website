// ==========================================
// Product Types
// ==========================================

export interface IProductImage {
  url: string;
  publicId: string;
  alt?: string;
  isMain?: boolean;
}

export interface IProductVariant {
  _id?: string;
  name: string;  // e.g. "Shade", "Size"
  value: string; // e.g. "Rose Blush", "30ml"
  sku: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  images?: IProductImage[];
  isActive: boolean;
}

export interface IProductSEO {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  canonicalUrl?: string;
}

export interface IProductDimensions {
  weight?: number;
  width?: number;
  height?: number;
  depth?: number;
}

export interface IProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  sku: string;
  category: ICategory;
  subcategory?: ISubcategory;
  brand?: IBrand;
  images: IProductImage[];
  variants: IProductVariant[];
  basePrice: number;
  compareAtPrice?: number;
  stock: number;
  lowStockThreshold: number;
  tags: string[];
  attributes: Record<string, string>;
  dimensions?: IProductDimensions;
  isFeatured: boolean;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  soldCount: number;
  seo: IProductSEO;
  createdAt: string;
  updatedAt: string;
}

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: IProductImage;
  isActive: boolean;
  productCount?: number;
}

export interface ISubcategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: IProductImage;
  category: string | ICategory;
  isActive: boolean;
}

export interface IBrand {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: IProductImage;
  website?: string;
  isActive: boolean;
  productCount?: number;
}

export interface IProductFilters {
  category?: string;
  subcategory?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  tags?: string[];
  inStock?: boolean;
  isFeatured?: boolean;
  search?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'bestselling' | 'name_asc';
  page?: number;
  limit?: number;
}

export interface IPaginatedProducts {
  products: IProduct[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
