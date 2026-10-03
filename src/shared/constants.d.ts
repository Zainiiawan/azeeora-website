export declare const APP_NAME = "AZEEORA COSMETICS";
export declare const APP_TAGLINE = "Luxury Beauty, Redefined.";
export declare const APP_DESCRIPTION = "Premium luxury cosmetics and beauty products. Discover our curated collection of skincare, makeup, and fragrances.";
export declare const PAGINATION_DEFAULTS: {
    readonly page: 1;
    readonly limit: 12;
    readonly maxLimit: 100;
};
export declare const ORDER_STATUSES: readonly ["pending", "pending_confirmation", "confirmed", "processing", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded", "return_requested", "returned"];
export declare const ORDER_STATUS_LABELS: Record<string, string>;
export declare const PAYMENT_METHODS: readonly ["cod", "jazzcash", "easypaisa"];
export declare const PAYMENT_METHOD_LABELS: Record<string, string>;
export declare const PAYMENT_STATUS_LABELS: Record<string, string>;
export declare const SORT_OPTIONS: readonly [{
    readonly value: "newest";
    readonly label: "Newest First";
}, {
    readonly value: "price_asc";
    readonly label: "Price: Low to High";
}, {
    readonly value: "price_desc";
    readonly label: "Price: High to Low";
}, {
    readonly value: "rating";
    readonly label: "Top Rated";
}, {
    readonly value: "bestselling";
    readonly label: "Best Selling";
}, {
    readonly value: "name_asc";
    readonly label: "Name: A to Z";
}];
export declare const RATING_OPTIONS: readonly [5, 4, 3, 2, 1];
export declare const MAX_CART_QUANTITY = 10;
export declare const FREE_SHIPPING_THRESHOLD = 5000;
export declare const SHIPPING_COST = 200;
export declare const SUPPORTED_COUNTRIES: readonly [{
    readonly code: "PK";
    readonly name: "Pakistan";
}, {
    readonly code: "US";
    readonly name: "United States";
}, {
    readonly code: "GB";
    readonly name: "United Kingdom";
}, {
    readonly code: "AE";
    readonly name: "United Arab Emirates";
}, {
    readonly code: "SA";
    readonly name: "Saudi Arabia";
}];
export declare const IMAGE_FORMATS: readonly ["image/jpeg", "image/png", "image/webp", "image/avif"];
export declare const MAX_IMAGE_SIZE: number;
export declare const COUPON_TYPES: {
    readonly PERCENTAGE: "percentage";
    readonly FIXED: "fixed";
    readonly BUY_X_GET_Y: "buy_x_get_y";
    readonly FREE_SHIPPING: "free_shipping";
};
export declare const USER_ROLES: {
    readonly ADMIN: "admin";
    readonly CUSTOMER: "customer";
};
export declare const CACHE_KEYS: {
    readonly PRODUCTS: "products";
    readonly CATEGORIES: "categories";
    readonly BRANDS: "brands";
    readonly FEATURED_PRODUCTS: "featured-products";
    readonly BESTSELLERS: "bestsellers";
    readonly NEW_ARRIVALS: "new-arrivals";
};
export declare const TOKEN_TYPES: {
    readonly ACCESS: "access";
    readonly REFRESH: "refresh";
    readonly EMAIL_VERIFICATION: "email_verification";
    readonly PASSWORD_RESET: "password_reset";
};
export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
};
//# sourceMappingURL=constants.d.ts.map