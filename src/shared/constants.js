"use strict";
// ==========================================
// Application Constants
// ==========================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.HTTP_STATUS = exports.TOKEN_TYPES = exports.CACHE_KEYS = exports.USER_ROLES = exports.COUPON_TYPES = exports.MAX_IMAGE_SIZE = exports.IMAGE_FORMATS = exports.SUPPORTED_COUNTRIES = exports.SHIPPING_COST = exports.FREE_SHIPPING_THRESHOLD = exports.MAX_CART_QUANTITY = exports.RATING_OPTIONS = exports.SORT_OPTIONS = exports.PAYMENT_STATUS_LABELS = exports.PAYMENT_METHOD_LABELS = exports.PAYMENT_METHODS = exports.ORDER_STATUS_LABELS = exports.ORDER_STATUSES = exports.PAGINATION_DEFAULTS = exports.APP_DESCRIPTION = exports.APP_TAGLINE = exports.APP_NAME = void 0;
exports.APP_NAME = 'AZEEORA COSMETICS';
exports.APP_TAGLINE = 'Luxury Beauty, Redefined.';
exports.APP_DESCRIPTION = 'Premium luxury cosmetics and beauty products. Discover our curated collection of skincare, makeup, and fragrances.';
exports.PAGINATION_DEFAULTS = {
    page: 1,
    limit: 12,
    maxLimit: 100,
};
exports.ORDER_STATUSES = [
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
];
exports.ORDER_STATUS_LABELS = {
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
exports.PAYMENT_METHODS = ['cod', 'jazzcash', 'easypaisa'];
exports.PAYMENT_METHOD_LABELS = {
    jazzcash: 'JazzCash',
    easypaisa: 'Easypaisa',
    cod: 'Cash on Delivery',
};
exports.PAYMENT_STATUS_LABELS = {
    pending: 'Pending',
    waiting_verification: 'Waiting Verification',
    paid: 'Paid',
    rejected: 'Rejected',
    failed: 'Failed',
    refunded: 'Refunded',
    partially_refunded: 'Partially Refunded',
};
exports.SORT_OPTIONS = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'bestselling', label: 'Best Selling' },
    { value: 'name_asc', label: 'Name: A to Z' },
];
exports.RATING_OPTIONS = [5, 4, 3, 2, 1];
exports.MAX_CART_QUANTITY = 10;
exports.FREE_SHIPPING_THRESHOLD = 5000; // PKR
exports.SHIPPING_COST = 200; // PKR
exports.SUPPORTED_COUNTRIES = [
    { code: 'PK', name: 'Pakistan' },
    { code: 'US', name: 'United States' },
    { code: 'GB', name: 'United Kingdom' },
    { code: 'AE', name: 'United Arab Emirates' },
    { code: 'SA', name: 'Saudi Arabia' },
];
exports.IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
exports.MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
exports.COUPON_TYPES = {
    PERCENTAGE: 'percentage',
    FIXED: 'fixed',
    BUY_X_GET_Y: 'buy_x_get_y',
    FREE_SHIPPING: 'free_shipping',
};
exports.USER_ROLES = {
    ADMIN: 'admin',
    CUSTOMER: 'customer',
};
exports.CACHE_KEYS = {
    PRODUCTS: 'products',
    CATEGORIES: 'categories',
    BRANDS: 'brands',
    FEATURED_PRODUCTS: 'featured-products',
    BESTSELLERS: 'bestsellers',
    NEW_ARRIVALS: 'new-arrivals',
};
exports.TOKEN_TYPES = {
    ACCESS: 'access',
    REFRESH: 'refresh',
    EMAIL_VERIFICATION: 'email_verification',
    PASSWORD_RESET: 'password_reset',
};
exports.HTTP_STATUS = {
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
};
//# sourceMappingURL=constants.js.map