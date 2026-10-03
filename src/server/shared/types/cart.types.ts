// ==========================================
// Cart Types
// ==========================================

export interface ICartItem {
  product: string;
  variant?: string;
  name: string;
  image: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  maxQuantity: number;
  sku: string;
  slug: string;
}

export interface ICart {
  _id?: string;
  user?: string;
  items: ICartItem[];
  subtotal: number;
  itemCount: number;
  couponCode?: string;
  couponDiscount?: number;
  updatedAt?: string;
}

export interface IWishlistItem {
  product: string;
  name: string;
  image: string;
  price: number;
  compareAtPrice?: number;
  slug: string;
  isInStock: boolean;
  addedAt: string;
}
