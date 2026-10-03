// ==========================================
// Application Constants
// ==========================================

export const APP_NAME = 'AYEZA COSMETICS';
export const APP_TAGLINE = 'Luxury Beauty, Redefined.';
export const APP_DESCRIPTION = 'Premium luxury cosmetics and beauty products. Discover our curated collection of skincare, makeup, and fragrances.';

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 12,
  maxLimit: 100,
} as const;

export const ORDER_STATUSES = [
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
] as const;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Order Placed',
  pending_confirmation: 'Pending Confirmation',
  confirmed: 'Order Confirmed',
  processing: 'Preparing Order',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  return_requested: 'Return Requested',
  returned: 'Returned',
};

export const PAYMENT_METHODS = ['cod', 'jazzcash', 'easypaisa'] as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  cod: 'Cash on Delivery',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  waiting_verification: 'Waiting Verification',
  paid: 'Paid',
  rejected: 'Rejected',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially Refunded',
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'bestselling', label: 'Best Selling' },
  { value: 'name_asc', label: 'Name: A to Z' },
] as const;

export const RATING_OPTIONS = [5, 4, 3, 2, 1] as const;

export const MAX_CART_QUANTITY = 10;
export const FREE_SHIPPING_THRESHOLD = 5000; // PKR
export const SHIPPING_COST = 200; // PKR

export const STORE_CONTACT = {
  name: 'AYEZA COSMETICS',
  phone: '+92 306 0466911',
  whatsapp: '923060466911',
  email: 'ayezacosmtics@gmail.com',
  city: 'Sahiwal',
  country: 'Pakistan',
  address: 'Sahiwal, Punjab, Pakistan',
  businessHours: 'Mon – Sat: 10:00 AM – 8:00 PM (PKT)',
  supportEmail: 'ayezacosmtics@gmail.com',
} as const;

export const SUPPORTED_COUNTRIES = [
  { code: 'PK', name: 'Pakistan' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
] as const;

export const IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export const VIDEO_FORMATS = ['video/mp4', 'video/webm'] as const;
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export const COUPON_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
  BUY_X_GET_Y: 'buy_x_get_y',
  FREE_SHIPPING: 'free_shipping',
} as const;

export const USER_ROLES = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
} as const;

export const CACHE_KEYS = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  BRANDS: 'brands',
  FEATURED_PRODUCTS: 'featured-products',
  BESTSELLERS: 'bestsellers',
  NEW_ARRIVALS: 'new-arrivals',
} as const;

export const TOKEN_TYPES = {
  ACCESS: 'access',
  REFRESH: 'refresh',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
