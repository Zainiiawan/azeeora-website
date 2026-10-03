import { z } from 'zod';
import { db, populate, newId, Doc } from '../db';
import {
  Router,
  json,
  validate,
  authenticate,
  optionalAuthenticate,
  adminOnly,
  requireEmailVerification,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../http';
import {
  applyProductDiscount,
  couponDiscount,
  couponIsValid,
  createNotification,
  getSettings,
  notifyAdmins,
  restockOrderItems,
} from '../commerce';
import {
  accountType,
  bumpUserCounter,
  findSponsor,
  getMemberSettings,
  isPartner,
  onOrderPlaced,
  onOrderStatusChange,
  partnerDiscountPct,
  postCredits,
  postEntries,
  recalcPendingCommission,
  round,
  unitBV,
  walletSummary,
  wholesaleTerms,
} from '../members';
import { updateOrderStatusSchema, ORDER_STATUS_LABELS, submitPaymentProofSchema, verifyPaymentSchema, MANUAL_PAYMENT_ACCOUNTS } from '../shared';
import {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendNewOrderNotificationEmail,
  sendPaymentStatusEmail,
} from '../email';
import { logger } from '../logger';

export const orders = new Router();

const addressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
});

const checkoutSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  paymentMethod: z.enum(['cod', 'jazzcash', 'easypaisa', 'wallet']),
  couponCode: z.string().min(1).optional(),
  refCode: z.string().max(20).optional(),
  walletAmount: z.number().min(0).optional(),
  pointsToRedeem: z.number().min(0).optional(),
  pickupPointId: z.string().optional(),
  notes: z.string().max(500).optional(),
  guestInfo: z
    .object({ firstName: z.string().min(1), lastName: z.string().min(1), email: z.string().email(), phone: z.string().min(1) })
    .optional(),
  items: z.array(z.object({ productId: z.string(), variant: z.string().optional(), quantity: z.number().min(1) })).optional(),
});

const userSummary = ['firstName', 'lastName', 'email', 'phone'];

const findVariant = (product: Doc, variantKey?: string, fallbackSku?: string) => {
  const variants: any[] = product.variants ?? [];
  if (variantKey) return variants.find((v) => v.sku === variantKey || v.value === variantKey) ?? null;
  return variants.find((v) => v.sku === (fallbackSku ?? product.sku)) ?? null;
};

/** Price one order line from the current product data. */
function priceLine(product: Doc, variantKey: string | undefined, quantity: number, overrides: { image?: string; sku?: string } = {}) {
  const variant = findVariant(product, variantKey);
  const originalPrice = variant ? variant.price : product.basePrice;
  const salePrice = applyProductDiscount(product, originalPrice);
  const productDiscount = Math.max(0, originalPrice - salePrice);
  const lineTotal = salePrice * quantity;
  return {
    product: product._id,
    variant: variantKey,
    name: product.name,
    image: overrides.image || (variant?.images?.length ? variant.images[0].url : product.images?.[0]?.url || ''),
    price: salePrice,
    originalPrice,
    salePrice,
    productDiscount,
    quantity,
    total: lineTotal,
    lineTotal,
    sku: overrides.sku || (variant ? variant.sku : product.sku),
  };
}

/** Deduct stock for one line, mutating the product (same rules as before). */
function deductStock(product: Doc, item: { variant?: string; sku?: string; quantity: number }) {
  const variant = findVariant(product, item.variant, item.sku);
  if (variant) {
    if (variant.stock < item.quantity) throw new BadRequestError(`Insufficient stock for ${product.name}`);
    variant.stock -= item.quantity;
  }
  if ((product.stock ?? 0) < item.quantity) {
    const sumVariantStock = (product.variants ?? []).reduce((s: number, v: any) => s + (v.stock ?? 0), 0);
    if (sumVariantStock < item.quantity) throw new BadRequestError(`Insufficient stock for ${product.name}`);
    product.stock = Math.max(0, sumVariantStock);
  } else {
    product.stock -= item.quantity;
  }
  product.soldCount = (product.soldCount ?? 0) + item.quantity;
}

async function nextOrderNumber() {
  const count = await db.orders.count();
  return `AZR-${Date.now()}-${String(count + 1).padStart(4, '0')}`;
}

const pagination = (page: number, limit: number, total: number) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 };
};

// ---------------------------------------------------------------------------
// Quote: one place that prices a basket for the current buyer
// ---------------------------------------------------------------------------
type QuoteLine = { productId: string; variant?: string; quantity: number; image?: string; sku?: string };

async function buildQuote(input: {
  user?: Doc | null;
  lines: QuoteLine[];
  couponCode?: string;
  city?: string;
  refCode?: string;
  walletAmount?: number;
  pointsToRedeem?: number;
  pickupPointId?: string;
}) {
  const settings = await getSettings();
  const ms = await getMemberSettings();
  const buyer = input.user ? await db.users.findById(input.user._id) : null;
  const buyerType = accountType(buyer);
  const discountPct = buyerType === 'partner' ? partnerDiscountPct(ms, Number(buyer?.monthlyBV ?? 0)) : 0;

  const items: any[] = [];
  const notices: string[] = [];
  let subtotal = 0;
  let productDiscountTotal = 0;
  let memberDiscount = 0;
  let bv = 0;

  for (const line of input.lines) {
    const product = await db.products.findById(line.productId);
    if (!product || !product.isActive) throw new NotFoundError(`Product ${line.productId}`);
    if (product.isComingSoon) throw new BadRequestError(`Product ${product.name} is coming soon and cannot be ordered.`);
    const priced: any = priceLine(product, line.variant, line.quantity, { image: line.image, sku: line.sku });
    const retailUnit = priced.price;
    let unit = retailUnit;
    if (buyerType === 'partner' && discountPct > 0) {
      unit = round(retailUnit * (1 - discountPct / 100));
    } else if (buyerType === 'business') {
      const terms = wholesaleTerms(product, retailUnit, ms);
      if (line.quantity >= terms.minQty) unit = Math.min(retailUnit, terms.price);
      else notices.push(`${product.name}: wholesale price applies from ${terms.minQty} units.`);
    }
    const lineBV = unitBV(product, retailUnit, ms) * line.quantity;
    Object.assign(priced, {
      retailPrice: retailUnit,
      memberPrice: unit !== retailUnit ? unit : undefined,
      price: unit,
      salePrice: unit,
      total: unit * line.quantity,
      lineTotal: unit * line.quantity,
      bv: lineBV,
    });
    memberDiscount += (retailUnit - unit) * line.quantity;
    subtotal += priced.lineTotal;
    productDiscountTotal += priced.productDiscount * line.quantity;
    bv += lineBV;
    items.push(priced);
  }
  if (items.length === 0) throw new BadRequestError('No items to checkout');

  // Shipping: city rate, else default; free above threshold
  let shippingCost: number | null = settings.defaultShippingCost;
  if (input.city) {
    const city = input.city.trim().toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
    const cityRate = await db.shippingRates.findOne({ city: { $regex: `^${city}$` }, isActive: true });
    if (cityRate) shippingCost = cityRate.cost;
  } else {
    shippingCost = null;
  }
  if (subtotal >= settings.freeShippingThreshold) shippingCost = 0;
  let pickupPoint: Doc | null = null;
  if (input.pickupPointId) {
    pickupPoint = await db.pickupPoints.findById(input.pickupPointId);
    if (!pickupPoint || pickupPoint.isActive === false) throw new BadRequestError('That pickup point is not available');
    shippingCost = 0;
  }

  // Coupon
  let discount = 0;
  let coupon: Doc | null = null;
  let couponError: string | undefined;
  const couponCode = input.couponCode ? String(input.couponCode).toUpperCase() : undefined;
  if (couponCode) {
    coupon = await db.coupons.findOne({ code: couponCode });
    if (!coupon) couponError = 'Coupon not found';
    else if (buyerType !== 'customer' && !ms.couponsForMembers) couponError = 'Coupons cannot be combined with partner or wholesale prices';
    else if (!couponIsValid(coupon)) couponError = 'Coupon is not valid';
    else if (coupon.perUserLimit && buyer && (coupon.usedBy ?? []).some((u: any) => String(u) === String(buyer._id))) {
      couponError = 'Coupon usage limit reached for this user';
    } else if (coupon.type === 'free_shipping') {
      if (shippingCost !== null) shippingCost = 0;
    } else {
      let cItems = items.map((i) => ({ productId: String(i.product), quantity: i.quantity, unitPrice: i.price }));
      let eligibleTotal = subtotal;
      if (coupon.applicableProducts?.length) {
        const allowed = new Set(coupon.applicableProducts.map(String));
        cItems = cItems.filter((i) => allowed.has(i.productId));
        eligibleTotal = items.filter((ci) => allowed.has(String(ci.product))).reduce((s, ci) => s + ci.total, 0);
      }
      discount = couponDiscount(coupon, eligibleTotal, { cartItems: cItems }) ?? 0;
    }
    if (couponError) coupon = null;
  }

  // Loyalty points
  const pointsBalance = Number(buyer?.loyaltyPoints ?? 0);
  let pointsRedeemed = 0;
  let pointsValue = 0;
  const wanted = Math.floor(Number(input.pointsToRedeem ?? 0));
  if (buyer && wanted > 0) {
    if (wanted < ms.minRedeemPoints) throw new BadRequestError(`You can redeem from ${ms.minRedeemPoints} points`);
    pointsRedeemed = Math.min(wanted, pointsBalance);
    pointsValue = Math.min(pointsRedeemed * ms.pointValueRs, Math.max(0, subtotal - discount));
    pointsRedeemed = Math.ceil(pointsValue / Math.max(0.0001, ms.pointValueRs));
  }

  const total = Math.max(0, subtotal + (shippingCost ?? 0) - discount - pointsValue);

  // Wallet
  const wallet = buyer ? await walletSummary(buyer._id) : { available: 0, pending: 0, earned: 0, withdrawn: 0 };
  const walletUsed = buyer ? Math.max(0, Math.min(Number(input.walletAmount ?? 0) || 0, wallet.available, total)) : 0;

  // Who earns the referral commission
  let sponsor: Doc | null = null;
  if (buyerType !== 'business') {
    if (buyer?.referredBy) sponsor = await db.users.findById(buyer.referredBy);
    else if (input.refCode) sponsor = await findSponsor(input.refCode);
    if (sponsor && (!isPartner(sponsor) || sponsor.isActive === false || sponsor._id === buyer?._id)) sponsor = null;
  }
  const commissionBase = Math.max(0, subtotal - discount - pointsValue);
  const commission = sponsor ? round((commissionBase * ms.referralCommissionPct) / 100) : 0;

  return {
    buyer,
    buyerType,
    discountPct,
    items,
    notices,
    subtotal,
    retailSubtotal: subtotal + memberDiscount,
    memberDiscount,
    productDiscount: productDiscountTotal,
    shippingCost,
    coupon,
    couponCode: coupon ? couponCode : undefined,
    couponError,
    discount,
    pointsRedeemed,
    pointsValue,
    pointsBalance,
    pointsEarned: buyer ? Math.floor(Math.max(0, total - (shippingCost ?? 0)) / Math.max(1, ms.loyaltyRsPerPoint)) : 0,
    wallet,
    walletUsed,
    total,
    amountDue: Math.max(0, total - walletUsed),
    bv,
    sponsor,
    commission,
    commissionPct: ms.referralCommissionPct,
    settings: ms,
    pickupPoint,
  };
}

const quoteSchema = z.object({
  items: z.array(z.object({ productId: z.string(), variant: z.string().optional(), quantity: z.number().min(1) })).optional(),
  couponCode: z.string().optional(),
  city: z.string().optional(),
  refCode: z.string().max(20).optional(),
  walletAmount: z.number().min(0).optional(),
  pointsToRedeem: z.number().min(0).optional(),
  pickupPointId: z.string().optional(),
});

async function linesFor(body: { items?: QuoteLine[] }, userId?: string) {
  if (body.items && body.items.length > 0) return { lines: body.items, cartDoc: null as Doc | null };
  if (!userId) throw new BadRequestError('Must provide items for guest checkout');
  const cartDoc = await db.carts.findOne({ user: userId });
  if (!cartDoc || (cartDoc.items ?? []).length === 0) throw new BadRequestError('Cart is empty');
  const lines = cartDoc.items.map((i: any) => ({ productId: String(i.product), variant: i.variant, quantity: i.quantity, image: i.image, sku: i.sku }));
  return { lines, cartDoc };
}

orders.post('/quote', optionalAuthenticate, validate(quoteSchema), async ({ body, user }) => {
  const { lines } = await linesFor(body, user?._id);
  const q = await buildQuote({ user, lines, couponCode: body.couponCode, city: body.city, refCode: body.refCode, walletAmount: body.walletAmount, pointsToRedeem: body.pointsToRedeem, pickupPointId: body.pickupPointId });
  return json({
    success: true,
    message: 'Quote',
    data: {
      buyerType: q.buyerType,
      discountPct: q.discountPct,
      items: q.items.map((i) => ({ product: i.product, name: i.name, image: i.image, quantity: i.quantity, retailPrice: i.retailPrice, price: i.price, total: i.total, bv: i.bv })),
      notices: q.notices,
      retailSubtotal: q.retailSubtotal,
      memberDiscount: q.memberDiscount,
      subtotal: q.subtotal,
      shippingCost: q.shippingCost,
      couponCode: q.couponCode,
      couponError: q.couponError,
      discount: q.discount,
      pointsBalance: q.pointsBalance,
      pointsRedeemed: q.pointsRedeemed,
      pointsValue: q.pointsValue,
      pointsEarned: q.pointsEarned,
      minRedeemPoints: q.settings.minRedeemPoints,
      walletAvailable: q.wallet.available,
      walletUsed: q.walletUsed,
      total: q.total,
      amountDue: q.amountDue,
      bv: q.bv,
      referredBy: q.sponsor ? `${q.sponsor.firstName} ${String(q.sponsor.lastName ?? '').slice(0, 1)}.` : null,
    },
  });
});

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------
orders.post('/', optionalAuthenticate, validate(checkoutSchema), async ({ body, user }) => {
  const userId = user?._id;
  const isGuest = !userId;
  const { shippingAddress, billingAddress, notes, guestInfo } = body;
  let paymentMethod: string = body.paymentMethod;

  if (isGuest && !guestInfo) {
    throw new BadRequestError('Guest info (name, email, phone) is required for guest checkout');
  }

  const { lines, cartDoc } = await linesFor(body, userId);
  const q = await buildQuote({
    user,
    lines,
    couponCode: body.couponCode ?? cartDoc?.couponCode,
    city: shippingAddress.city,
    refCode: body.refCode,
    walletAmount: body.walletAmount,
    pointsToRedeem: body.pointsToRedeem,
    pickupPointId: body.pickupPointId,
  });
  if (q.couponError && body.couponCode) throw new BadRequestError(q.couponError);
  const finalItems = q.items;
  const { subtotal, discount, coupon, total } = q;
  const shippingCost = q.shippingCost ?? 0;
  const productDiscountTotal = q.productDiscount;
  const couponCode = q.couponCode;
  if (q.amountDue === 0 && q.walletUsed > 0) paymentMethod = 'wallet';
  if (paymentMethod === 'wallet' && q.amountDue > 0) throw new BadRequestError('Your wallet balance does not cover this order');

  const tax = 0;
  const isCod = paymentMethod === 'cod';
  const isWallet = paymentMethod === 'wallet';
  const initialStatus = isCod || isWallet ? 'pending_confirmation' : 'pending';
  const initialMessage = isWallet
    ? 'Order placed and paid from wallet. Awaiting confirmation.'
    : isCod
      ? 'Order placed. Awaiting admin confirmation (Cash on Delivery).'
      : `Order placed. Please send payment via ${paymentMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} and submit your transaction proof.`;

  // Spend points and wallet first (both atomic); undo them if anything after fails
  const orderId = newId();
  const orderNumber = await nextOrderNumber();
  let pointsTaken = false;
  let walletTaken = false;
  if (userId && q.pointsRedeemed > 0) {
    pointsTaken = await bumpUserCounter(userId, 'loyaltyPoints', -q.pointsRedeemed);
    if (!pointsTaken) throw new BadRequestError('Not enough loyalty points');
  }
  try {
    if (userId && q.walletUsed > 0) {
      await postEntries([
        { user: userId, type: 'order_payment', amount: -q.walletUsed, status: 'available', order: orderId, orderNumber, note: `Payment for order ${orderNumber}` },
      ]);
      walletTaken = true;
    }

    // Reserve stock before creating the order so a failure leaves nothing behind
    const touchedProducts = new Map<string, Doc>();
    for (const item of finalItems) {
      const product = touchedProducts.get(item.product) ?? (await db.products.findById(item.product));
      if (!product || !product.isActive) throw new NotFoundError('Product');
      deductStock(product, item);
      touchedProducts.set(product._id, product);
    }
    for (const product of touchedProducts.values()) await db.products.save(product);
  } catch (err) {
    if (pointsTaken && userId) await bumpUserCounter(userId, 'loyaltyPoints', q.pointsRedeemed);
    if (walletTaken && userId) {
      await postCredits([{ user: userId, type: 'order_refund', amount: q.walletUsed, status: 'available', order: orderId, orderNumber, note: 'Checkout did not complete' }]);
    }
    throw err;
  }

  // A customer who came through a partner's link stays linked to that partner
  if (q.buyer && q.sponsor && !q.buyer.referredBy && q.buyerType === 'customer') {
    await db.users.updateById(q.buyer._id, { referredBy: q.sponsor._id, referredAt: new Date().toISOString() });
  }

  const order = await db.orders.create({
    _id: orderId,
    orderNumber,
    user: userId,
    customerType: isGuest ? 'guest' : 'registered',
    customerName: isGuest ? `${guestInfo?.firstName} ${guestInfo?.lastName}` : `${user?.firstName} ${user?.lastName}`,
    customerEmail: isGuest ? guestInfo?.email : user?.email,
    customerPhone: isGuest ? guestInfo?.phone : shippingAddress.phone,
    items: finalItems,
    shippingAddress,
    billingAddress,
    subtotal,
    shippingCost,
    productDiscount: productDiscountTotal,
    discount,
    manualDiscount: 0,
    pointsDiscount: q.pointsValue,
    deliveryMethod: q.pickupPoint ? 'pickup' : 'home',
    pickupPoint: q.pickupPoint ? { _id: q.pickupPoint._id, name: q.pickupPoint.name, city: q.pickupPoint.city, address: q.pickupPoint.address, phone: q.pickupPoint.phone } : undefined,
    walletUsed: q.walletUsed,
    amountDue: q.amountDue,
    tax,
    total,
    couponCode: couponCode ? String(couponCode).toUpperCase() : undefined,
    couponDiscount: discount,
    orderType: q.buyerType === 'business' ? 'b2b' : q.buyerType === 'partner' ? 'partner' : 'b2c',
    member: {
      buyerType: q.buyerType,
      discountPct: q.discountPct,
      memberDiscount: q.memberDiscount,
      bv: q.bv,
      sponsor: q.sponsor?._id,
      sponsorCode: q.sponsor?.memberCode,
      commission: q.commission,
      commissionPct: q.sponsor ? q.commissionPct : 0,
      pointsRedeemed: q.pointsRedeemed,
      pointsEarned: q.pointsEarned,
      walletUsed: q.walletUsed,
    },
    paymentMethod,
    paymentStatus: q.amountDue === 0 ? 'paid' : 'pending',
    status: initialStatus,
    notes,
    trackingHistory: [{ status: initialStatus, message: initialMessage, timestamp: new Date().toISOString() }],
    auditLog: [],
  });
  await onOrderPlaced(order);

  if (coupon) {
    coupon.usageCount = (coupon.usageCount ?? 0) + 1;
    if (userId) coupon.usedBy = [...(coupon.usedBy ?? []), String(userId)];
    await db.coupons.save(coupon);
  }

  if (cartDoc) {
    Object.assign(cartDoc, { items: [], subtotal: 0, itemCount: 0, couponDiscount: 0 });
    delete cartDoc.couponCode;
    await db.carts.save(cartDoc);
  }

  try {
    await sendOrderConfirmationEmail(order.customerEmail, String(order.customerName).split(' ')[0], order as any);
  } catch {
    // never fail checkout on email
  }

  if (userId) {
    await createNotification({
      userId,
      type: 'order_placed',
      title: 'Order Placed',
      message: `Your order ${order.orderNumber} has been placed successfully.`,
      orderId: order._id,
      link: `/account/orders/${order._id}`,
    });
  }

  try {
    await sendNewOrderNotificationEmail(process.env.ADMIN_EMAIL || 'azeeoracosmetics@gmail.com', order);
  } catch {
    // ignore
  }

  await notifyAdmins({
    type: 'general',
    title: 'New Order',
    message: `New order ${order.orderNumber} — ${paymentMethod.toUpperCase()} — Rs.${total.toLocaleString()}`,
    orderId: order._id,
    link: '/admin/orders',
  });

  return json({ success: true, message: 'Order created', data: order }, 201);
});

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
orders.get('/', authenticate, async ({ query, user }) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 12);
  const filter = { user: user!._id };
  const [total, list] = await Promise.all([
    db.orders.count(filter),
    db.orders.find(filter, { sort: { createdAt: -1 }, skip: (page - 1) * limit, limit }),
  ]);
  return json({ success: true, message: 'Orders fetched', data: { orders: list, pagination: pagination(page, limit, total) } });
});

orders.get('/admin/all', adminOnly, async ({ query }) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;

  const [total, list] = await Promise.all([
    db.orders.count(filter),
    db.orders.find(filter, { sort: { createdAt: -1 }, skip: (page - 1) * limit, limit }),
  ]);
  await populate(list, 'user', db.users, userSummary);
  return json({
    success: true,
    message: 'Admin orders fetched',
    data: { orders: list, pagination: pagination(page, limit, total) },
  });
});

orders.get('/track/lookup', async ({ query }) => {
  const orderNumber = String(query.orderNumber ?? '').trim();
  const email = String(query.email ?? '').trim().toLowerCase();
  if (!orderNumber || !email) throw new BadRequestError('Order number and email are required');

  const order = await db.orders.findOne({ orderNumber });
  if (!order) throw new NotFoundError('Order');
  await populate([order], 'user', db.users, ['email', 'firstName', 'lastName']);

  const orderEmail = String(order.user?.email || order.customerEmail || '').trim().toLowerCase();
  if (orderEmail !== email) throw new ForbiddenError('Order not found for this email');

  const pick = [
    '_id', 'orderNumber', 'status', 'paymentMethod', 'paymentStatus', 'total', 'subtotal', 'shippingCost', 'items',
    'shippingAddress', 'trackingNumber', 'courierName', 'trackingUrl', 'estimatedDelivery', 'dispatchedAt',
    'trackingHistory', 'createdAt', 'updatedAt',
  ];
  return json({
    success: true,
    message: 'Order tracking fetched',
    data: Object.fromEntries(pick.map((k) => [k, order[k]])),
  });
});

orders.get('/:orderId', authenticate, async ({ params, user }) => {
  const order = await db.orders.findById(params.orderId);
  if (!order) throw new NotFoundError('Order');
  if (String(order.user) !== String(user!._id) && user!.role !== 'admin' && user!.role !== 'warehouse') {
    throw new ForbiddenError('You do not have access to this order');
  }
  return json({ success: true, message: 'Order fetched', data: order });
});

// ---------------------------------------------------------------------------
// Admin edits
// ---------------------------------------------------------------------------
const adminEditSchema = z.object({
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  shippingAddress: addressSchema.optional(),
  items: z.array(z.object({ product: z.string(), variant: z.string().optional(), quantity: z.number().min(1) })).optional(),
  shippingCost: z.number().min(0).optional(),
  manualDiscount: z.number().min(0).optional(),
  manualDiscountReason: z.string().optional(),
});

orders.patch('/:orderId/admin-edit', adminOnly, validate(adminEditSchema), async ({ params, body, user }) => {
  const order = await db.orders.findById(params.orderId);
  if (!order) throw new NotFoundError('Order');

  const oldValues = structuredClone(order);
  let hasChanges = false;

  for (const key of ['customerName', 'customerEmail', 'customerPhone'] as const) {
    if (body[key] !== undefined && body[key] !== order[key]) {
      order[key] = body[key];
      hasChanges = true;
    }
  }
  if (body.shippingAddress) {
    order.shippingAddress = { ...order.shippingAddress, ...body.shippingAddress };
    hasChanges = true;
  }

  if (body.items) {
    // Validate and price the new lines first, so a bad edit changes nothing
    const products = new Map<string, Doc>();
    const loadProduct = async (id: string) => {
      if (!products.has(id)) {
        const p = await db.products.findById(id);
        if (p) products.set(id, p);
      }
      return products.get(id);
    };

    // Give back stock for the old lines (in memory)
    for (const old of order.items ?? []) {
      const product = await loadProduct(String(old.product));
      if (!product) continue;
      if (old.variant) {
        const v = (product.variants ?? []).find((x: any) => x.sku === old.variant || x.value === old.variant || x.sku === old.sku);
        if (v) v.stock = (v.stock ?? 0) + old.quantity;
      }
      product.stock = (product.stock ?? 0) + old.quantity;
      product.soldCount = Math.max(0, (product.soldCount ?? 0) - old.quantity);
    }

    let newSubtotal = 0;
    let newProductDiscount = 0;
    let newBV = 0;
    const newItems = [];
    const ms = await getMemberSettings();
    const member = order.member ?? {};
    for (const input of body.items) {
      const product = await loadProduct(input.product);
      if (!product || !product.isActive) throw new BadRequestError(`Product ${input.product} is invalid`);
      const priced: any = priceLine(product, input.variant, input.quantity);
      // Keep the buyer's member price (partner discount / wholesale) on edited lines
      const retailUnit = priced.price;
      let unit = retailUnit;
      if (member.buyerType === 'partner' && member.discountPct > 0) unit = round(retailUnit * (1 - member.discountPct / 100));
      if (member.buyerType === 'business') {
        const terms = wholesaleTerms(product, retailUnit, ms);
        if (input.quantity >= terms.minQty) unit = Math.min(retailUnit, terms.price);
      }
      const lineBV = unitBV(product, retailUnit, ms) * input.quantity;
      Object.assign(priced, { retailPrice: retailUnit, price: unit, salePrice: unit, total: unit * input.quantity, lineTotal: unit * input.quantity, bv: lineBV });
      newBV += lineBV;
      newSubtotal += priced.lineTotal;
      newProductDiscount += priced.productDiscount * input.quantity;
      newItems.push(priced);
      deductStock(product, { variant: input.variant, quantity: input.quantity, sku: priced.sku });
    }

    for (const p of products.values()) await db.products.save(p);
    order.items = newItems;
    order.subtotal = newSubtotal;
    order.productDiscount = newProductDiscount;
    if (order.member) {
      const delta = newBV - Number(order.member.bv ?? 0);
      if (delta && order.user && order.member.buyerType === 'partner' && !['cancelled', 'refunded'].includes(order.status)) {
        await bumpUserCounter(order.user, 'monthlyBV', delta);
        await bumpUserCounter(order.user, 'totalBV', delta);
      }
      order.member = { ...order.member, bv: newBV };
    }
    hasChanges = true;
  }

  if (body.shippingCost !== undefined && body.shippingCost !== order.shippingCost) {
    order.shippingCost = body.shippingCost;
    hasChanges = true;
  }
  if (body.manualDiscount !== undefined && body.manualDiscount !== order.manualDiscount) {
    order.manualDiscount = body.manualDiscount;
    hasChanges = true;
  }
  if (body.manualDiscountReason !== undefined) order.manualDiscountReason = body.manualDiscountReason;

  const subtotal = order.subtotal || 0;
  const manual = order.manualDiscount || 0;
  if (manual > subtotal) throw new BadRequestError('Manual discount cannot exceed subtotal');
  order.total = Math.max(0, subtotal - (order.couponDiscount || 0) - (order.pointsDiscount || 0) - manual + (order.shippingCost || 0) + (order.tax || 0));
  order.amountDue = Math.max(0, order.total - (order.walletUsed || 0));

  if (hasChanges) {
    const withoutLog = (o: Doc) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'auditLog'));
    const newValues = withoutLog(order);
    const prevValues = withoutLog(oldValues);
    order.auditLog = [
      ...(order.auditLog ?? []),
      {
        timestamp: new Date().toISOString(),
        adminUser: user!._id,
        adminName: `${user!.firstName} ${user!.lastName}`,
        actionPerformed: 'Order Edited',
        oldValues: prevValues,
        newValues,
      },
    ];
  }
  await db.orders.save(order);
  if (hasChanges) await recalcPendingCommission(order);

  if (hasChanges) {
    const to = order.customerEmail || (order.user ? (await db.users.findById(order.user))?.email : null);
    if (to) {
      try {
        await sendOrderConfirmationEmail(to, order.customerName ? order.customerName.split(' ')[0] : 'Customer', order as any);
      } catch (e) {
        logger.error('Failed to send update email', e);
      }
    }
  }

  return json({ success: true, message: 'Order updated successfully', data: order });
});

/** Change an order's status with all side effects (stock, emails, notifications, commissions). Used by admin and warehouse. */
export async function applyOrderStatus(orderId: string, body: z.infer<typeof updateOrderStatusSchema>, extra: Record<string, unknown> = {}) {
  const { status, message, trackingNumber, courierName, trackingUrl, estimatedDelivery, dispatchedAt, location } = body;
  const order = await db.orders.findById(orderId);
  if (!order) throw new NotFoundError('Order');

  const previousStatus = order.status;
  const now = new Date().toISOString();
  const codApproval = order.paymentMethod === 'cod' && order.status === 'pending_confirmation' && status === 'processing';

  order.status = status;
  Object.assign(order, extra);
  order.trackingHistory = [
    ...(order.trackingHistory ?? []),
    {
      status,
      message: codApproval ? message || 'COD order approved. Preparing your order.' : message ?? 'Status updated',
      timestamp: now,
      location,
    },
  ];

  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (courierName) order.courierName = courierName;
  if (trackingUrl) order.trackingUrl = trackingUrl;
  if (estimatedDelivery) order.estimatedDelivery = new Date(estimatedDelivery).toISOString();
  if (dispatchedAt) order.dispatchedAt = new Date(dispatchedAt).toISOString();
  if (status === 'shipped' && !order.dispatchedAt) order.dispatchedAt = now;

  const isClosing = status === 'cancelled' || status === 'refunded';
  const wasClosed = previousStatus === 'cancelled' || previousStatus === 'refunded';
  if (isClosing && !wasClosed) await restockOrderItems(order.items ?? []);
  if (status === 'delivered' && order.paymentMethod === 'cod' && order.paymentStatus !== 'paid') order.paymentStatus = 'paid';

  await db.orders.save(order);
  await onOrderStatusChange(order, previousStatus);

  const label = ORDER_STATUS_LABELS[order.status] || order.status;
  let notifType = 'general';
  if (order.status === 'processing' || order.status === 'confirmed') notifType = 'order_processing';
  if (order.status === 'shipped' || order.status === 'out_for_delivery') notifType = 'order_shipped';
  if (order.status === 'delivered') notifType = 'order_delivered';
  if (order.status === 'cancelled') notifType = 'order_cancelled';

  if (order.user) {
    await createNotification({
      userId: String(order.user),
      type: notifType,
      title: label,
      message: message || `Your order ${order.orderNumber} is now ${label}.`,
      orderId: order._id,
      link: `/account/orders/${order._id}`,
    });
  }

  let customerEmail = order.customerEmail || '';
  let customerFirstName = order.customerName ? String(order.customerName).split(' ')[0] : '';
  if (order.user) {
    const u = await db.users.findById(order.user);
    if (u) {
      customerEmail = u.email;
      customerFirstName = u.firstName;
    }
  }
  if (customerEmail && customerFirstName) {
    try {
      await sendOrderStatusEmail(customerEmail, customerFirstName, order.orderNumber, order._id, label, order as any);
    } catch (err) {
      logger.error('Email sending error', err);
    }
  }

  return order;
}

orders.patch('/:orderId/status', adminOnly, validate(updateOrderStatusSchema), async ({ params, body }) => {
  const order = await applyOrderStatus(params.orderId, body);
  return json({ success: true, message: 'Order status updated', data: order });
});

orders.delete('/:orderId', adminOnly, async ({ params }) => {
  const order = await db.orders.findById(params.orderId);
  if (!order) throw new NotFoundError('Order');
  if (order.status !== 'cancelled' && order.status !== 'refunded') {
    await restockOrderItems(order.items ?? []);
    // Deleting a live order undoes it like a cancellation (commission, wallet, points)
    const previousStatus = order.status;
    order.status = 'cancelled';
    await onOrderStatusChange(order, previousStatus);
  }
  await db.orders.deleteById(order._id);
  return json({ success: true, message: 'Order deleted successfully', data: { _id: order._id } });
});

// ===========================================================================
// Manual payments (JazzCash / Easypaisa proof + admin verification)
// ===========================================================================
export const payments = new Router();

payments.get('/accounts', () => json({ success: true, message: 'Manual payment accounts', data: MANUAL_PAYMENT_ACCOUNTS }));

payments.get('/pending', adminOnly, async ({ query }) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const filter = {
    paymentMethod: { $in: ['jazzcash', 'easypaisa'] },
    paymentStatus: { $in: ['waiting_verification', 'rejected'] },
  };
  const [total, list] = await Promise.all([
    db.orders.count(filter),
    db.orders.find(filter, { sort: { updatedAt: -1 }, skip: (page - 1) * limit, limit }),
  ]);
  await populate(list, 'user', db.users, userSummary);
  return json({
    success: true,
    message: 'Pending payments fetched',
    data: { orders: list, pagination: pagination(page, limit, total) },
  });
});

payments.post(
  '/:orderId/proof',
  authenticate,
  requireEmailVerification,
  validate(submitPaymentProofSchema),
  async ({ params, body, user }) => {
    const order = await db.orders.findById(params.orderId);
    if (!order) throw new NotFoundError('Order');
    if (String(order.user) !== String(user!._id)) throw new ForbiddenError('Not allowed');
    if (!['jazzcash', 'easypaisa'].includes(order.paymentMethod)) {
      throw new BadRequestError('Payment proof is only required for JazzCash / Easypaisa orders');
    }
    if (order.paymentStatus === 'paid') throw new BadRequestError('Payment already approved for this order');

    order.paymentProof = {
      transactionId: String(body.transactionId).trim(),
      paidAmount: Number(body.paidAmount),
      screenshotUrl: body.screenshotUrl,
      screenshotPublicId: body.screenshotPublicId,
      note: body.note,
      submittedAt: new Date().toISOString(),
    };
    order.paymentStatus = 'waiting_verification';
    order.trackingHistory = [
      ...(order.trackingHistory ?? []),
      { status: 'pending', message: 'Payment proof submitted. Waiting for admin verification.', timestamp: new Date().toISOString() },
    ];
    await db.orders.save(order);

    await createNotification({
      userId: String(order.user),
      type: 'payment_received',
      title: 'Payment Received',
      message: `We received your payment proof for order ${order.orderNumber}. Verification is in progress.`,
      orderId: order._id,
      link: `/account/orders/${order._id}`,
    });
    await notifyAdmins({
      type: 'general',
      title: 'Payment Proof Submitted',
      message: `Order ${order.orderNumber} — payment proof awaiting verification.`,
      orderId: order._id,
      link: '/admin/payments',
    });

    return json({ success: true, message: 'Payment proof submitted successfully', data: order }, 201);
  }
);

payments.patch('/:orderId/verify', adminOnly, validate(verifyPaymentSchema), async ({ params, body, user }) => {
  const order = await db.orders.findById(params.orderId);
  if (!order) throw new NotFoundError('Order');
  if (!order.paymentProof) throw new BadRequestError('No payment proof submitted');
  if (order.paymentStatus === 'paid') throw new BadRequestError('Payment already approved');

  const now = new Date().toISOString();
  const approved = body.action === 'approve';
  order.paymentProof.verifiedAt = now;
  order.paymentProof.verifiedBy = user!._id;

  if (approved) {
    order.paymentStatus = 'paid';
    order.status = 'processing';
    delete order.paymentProof.rejectionReason;
    order.trackingHistory = [
      ...(order.trackingHistory ?? []),
      { status: 'processing', message: 'Payment approved. Order confirmed and being prepared.', timestamp: now },
    ];
  } else {
    order.paymentStatus = 'rejected';
    order.paymentProof.rejectionReason =
      body.rejectionReason || 'Payment proof rejected. Please resubmit with a valid transaction ID and screenshot.';
    order.trackingHistory = [
      ...(order.trackingHistory ?? []),
      { status: 'pending', message: `Payment rejected. ${order.paymentProof.rejectionReason}`, timestamp: now },
    ];
  }
  await db.orders.save(order);

  await createNotification({
    userId: String(order.user),
    type: approved ? 'payment_approved' : 'payment_rejected',
    title: approved ? 'Payment Approved' : 'Payment Rejected',
    message: approved
      ? `Payment for order ${order.orderNumber} was approved. Your order is being prepared.`
      : order.paymentProof.rejectionReason,
    orderId: order._id,
    link: approved ? `/account/orders/${order._id}` : `/account/orders/${order._id}/pay`,
  });

  const owner = await db.users.findById(order.user);
  if (owner) {
    try {
      await sendPaymentStatusEmail(
        owner.email,
        owner.firstName,
        order.orderNumber,
        order._id,
        approved,
        approved ? undefined : order.paymentProof.rejectionReason
      );
    } catch {
      // ignore
    }
  }

  return json({ success: true, message: approved ? 'Payment approved' : 'Payment rejected', data: order });
});
