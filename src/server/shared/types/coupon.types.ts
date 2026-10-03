// ==========================================
// Coupon & Discount Types
// ==========================================

export type CouponType = 'percentage' | 'fixed' | 'buy_x_get_y' | 'free_shipping';

export interface IBuyXGetY {
  buyQuantity: number;
  getQuantity: number;
  getProductIds?: string[];
  discountPercentage?: number;
}

export interface ICoupon {
  _id: string;
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  buyXGetY?: IBuyXGetY;
  applicableProducts?: string[];
  applicableCategories?: string[];
  usageLimit?: number;
  usageCount: number;
  perUserLimit?: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
}

export interface IDiscount {
  _id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  startDate?: string;
  endDate?: string;
  isActive: boolean;
}

export interface ICouponValidation {
  isValid: boolean;
  discount: number;
  message: string;
  coupon?: ICoupon;
}
