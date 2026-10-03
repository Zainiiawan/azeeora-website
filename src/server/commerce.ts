import { db, Doc } from './db';
import { logger } from './logger';

const asDate = (v: unknown) => (v ? new Date(v as string) : undefined);

/** Product-level sale price (was applyProductDiscount in cart/order routes). */
export const applyProductDiscount = (product: Doc, basePrice: number): number => {
  const discount = product.discount;
  if (!discount || discount.type == null || discount.value == null) return basePrice;

  const now = new Date();
  const startDate = asDate(discount.startDate);
  const endDate = asDate(discount.endDate);
  const active = (!startDate || startDate <= now) && (!endDate || endDate >= now);
  if (!active) return basePrice;
  if (!Number.isFinite(basePrice) || !Number.isFinite(Number(discount.value))) return basePrice;

  if (discount.type === 'percentage') return basePrice * (1 - Number(discount.value) / 100);
  if (discount.type === 'fixed') return Math.max(0, basePrice - Number(discount.value));
  return basePrice;
};

export const getMainImage = (product: Doc) => {
  const images = product.images ?? [];
  return images.find((i: any) => i.isMain) ?? images[0];
};

// ---------------------------------------------------------------------------
// Coupons (methods from the old Coupon model)
// ---------------------------------------------------------------------------
export const couponIsValid = (coupon: Doc): boolean => {
  if (!coupon.isActive) return false;
  const now = new Date();
  const start = asDate(coupon.startDate);
  const end = asDate(coupon.endDate);
  if (start && start > now) return false;
  if (end && end < now) return false;
  if (coupon.usageLimit && (coupon.usageCount ?? 0) >= coupon.usageLimit) return false;
  return true;
};

export type DiscountItem = { productId: string; quantity: number; unitPrice: number };

export const couponDiscount = (
  coupon: Doc,
  cartTotal: number,
  context?: { cartItems?: DiscountItem[] }
): number => {
  if (!couponIsValid(coupon)) return 0;
  if (coupon.minOrderAmount && cartTotal < coupon.minOrderAmount) return 0;

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = cartTotal * (coupon.value / 100);
    if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
  } else if (coupon.type === 'fixed') {
    discount = coupon.value;
  } else if (coupon.type === 'buy_x_get_y') {
    const bxgy = coupon.buyXGetY;
    if (!bxgy) return 0;
    const cartItems = context?.cartItems ?? [];
    const eligibleIds: string[] | null =
      bxgy.getProductIds && bxgy.getProductIds.length > 0 ? bxgy.getProductIds.map(String) : null;
    const eligible = eligibleIds ? cartItems.filter((i) => eligibleIds.includes(String(i.productId))) : cartItems;
    if (eligible.length === 0) return 0;

    const unitsPerSet = bxgy.buyQuantity + bxgy.getQuantity;
    const totalQty = eligible.reduce((s, i) => s + i.quantity, 0);
    const discountedUnits = Math.floor(totalQty / unitsPerSet) * bxgy.getQuantity;
    if (discountedUnits <= 0) return 0;

    const pct = bxgy.discountPercentage ?? coupon.value;
    const unitPrices: number[] = [];
    for (const item of eligible) for (let i = 0; i < item.quantity; i++) unitPrices.push(item.unitPrice);
    unitPrices.sort((a, b) => b - a);
    discount = unitPrices.slice(0, discountedUnits).reduce((s, p) => s + p, 0) * (pct / 100);
    if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
  }
  return Math.min(discount, cartTotal);
};

// ---------------------------------------------------------------------------
// Settings + reviews
// ---------------------------------------------------------------------------
export async function getSettings(): Promise<Doc> {
  const existing = await db.settings.findOne({}, { sort: { createdAt: 1 } });
  if (existing) return existing;
  return db.settings.create({ defaultShippingCost: 200, freeShippingThreshold: 5000, vipThreshold: 5000 });
}

/** Recalculate a product's average rating and review count from approved reviews. */
export async function refreshProductRating(productId: string) {
  const reviews = await db.reviews.find({ product: productId, isApproved: true }, { sort: { createdAt: -1 } });
  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / count : 0;
  await db.products.updateById(productId, { rating: count ? Math.round(avg * 10) / 10 : 0, reviewCount: count });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
type NotificationInput = {
  type: string;
  title: string;
  message: string;
  orderId?: string;
  link?: string;
  meta?: Record<string, unknown>;
};

export async function createNotification(params: NotificationInput & { userId: string }) {
  try {
    await db.notifications.create({
      user: String(params.userId),
      type: params.type,
      title: params.title.slice(0, 120),
      message: params.message.slice(0, 500),
      order: params.orderId,
      link: params.link,
      isRead: false,
      meta: params.meta,
    });
  } catch (error) {
    logger.error('Failed to create notification', error);
  }
}

export async function notifyAdmins(params: NotificationInput) {
  try {
    const admins = await db.users.find({ role: 'admin', isActive: true });
    await Promise.all(admins.map((a) => createNotification({ ...params, userId: a._id })));
  } catch (error) {
    logger.error('Failed to notify admins', error);
  }
}

/** Return stock for every line of an order (used on cancel/refund/delete/edit). */
export async function restockOrderItems(items: Doc[]) {
  for (const item of items) {
    const product = await db.products.findById(item.product);
    if (!product) continue;
    if (item.variant) {
      const variant = (product.variants ?? []).find(
        (v: any) => v.sku === item.variant || v.value === item.variant || v.sku === item.sku
      );
      if (variant) variant.stock = (variant.stock ?? 0) + item.quantity;
    }
    product.stock = (product.stock ?? 0) + item.quantity;
    product.soldCount = Math.max(0, (product.soldCount ?? 0) - item.quantity);
    await db.products.save(product);
  }
}
