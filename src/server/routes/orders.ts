import { z } from 'zod';
import { db, populate, Doc } from '../db';
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
  paymentMethod: z.enum(['cod', 'jazzcash', 'easypaisa']),
  couponCode: z.string().min(1).optional(),
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
// Checkout
// ---------------------------------------------------------------------------
orders.post('/', optionalAuthenticate, validate(checkoutSchema), async ({ body, user }) => {
  const userId = user?._id;
  const isGuest = !userId;
  const { shippingAddress, billingAddress, paymentMethod, notes, guestInfo } = body;

  if (isGuest && !guestInfo) {
    throw new BadRequestError('Guest info (name, email, phone) is required for guest checkout');
  }

  const finalItems: any[] = [];
  let subtotal = 0;
  let productDiscountTotal = 0;
  let cartDoc: Doc | null = null;

  const lines: Array<{ productId: string; variant?: string; quantity: number; image?: string; sku?: string }> = [];
  if (body.items && body.items.length > 0) {
    lines.push(...body.items);
  } else {
    if (!userId) throw new BadRequestError('Must provide items for guest checkout');
    cartDoc = await db.carts.findOne({ user: userId });
    if (!cartDoc || (cartDoc.items ?? []).length === 0) throw new BadRequestError('Cart is empty');
    for (const i of cartDoc.items) {
      lines.push({ productId: String(i.product), variant: i.variant, quantity: i.quantity, image: i.image, sku: i.sku });
    }
  }

  for (const line of lines) {
    const product = await db.products.findById(line.productId);
    if (!product || !product.isActive) {
      throw new NotFoundError(cartDoc ? 'Product' : `Product ${line.productId}`);
    }
    if (product.isComingSoon) throw new BadRequestError(`Product ${product.name} is coming soon and cannot be ordered.`);
    const priced = priceLine(product, line.variant, line.quantity, { image: line.image, sku: line.sku });
    subtotal += priced.lineTotal;
    productDiscountTotal += priced.productDiscount * line.quantity;
    finalItems.push(priced);
  }
  if (finalItems.length === 0) throw new BadRequestError('No items to checkout');

  const couponCode: string | undefined = body.couponCode ?? cartDoc?.couponCode;

  // Shipping: city rate, else default; free above threshold
  const settings = await getSettings();
  let shippingCost = settings.defaultShippingCost;
  const city = shippingAddress.city.trim().toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase());
  const cityRate = await db.shippingRates.findOne({ city: { $regex: `^${city}$` }, isActive: true });
  if (cityRate) shippingCost = cityRate.cost;
  if (subtotal >= settings.freeShippingThreshold) shippingCost = 0;

  let discount = 0;
  let coupon: Doc | null = null;
  if (couponCode) {
    coupon = await db.coupons.findOne({ code: String(couponCode).toUpperCase() });
    if (!coupon) throw new NotFoundError('Coupon');
    if (!couponIsValid(coupon)) throw new ForbiddenError('Coupon is not valid');
    if (coupon.perUserLimit && coupon.usedBy?.length && userId) {
      if ((coupon.usedBy ?? []).some((u: any) => String(u) === String(userId))) {
        throw new ForbiddenError('Coupon usage limit reached for this user');
      }
    }
    if (coupon.type === 'free_shipping') {
      shippingCost = 0;
    } else {
      let items = finalItems.map((i) => ({ productId: String(i.product), quantity: i.quantity, unitPrice: i.price }));
      let eligibleTotal = subtotal;
      if (coupon.applicableProducts?.length) {
        const allowed = new Set(coupon.applicableProducts.map(String));
        items = items.filter((i) => allowed.has(i.productId));
        eligibleTotal = finalItems.filter((ci) => allowed.has(String(ci.product))).reduce((s, ci) => s + ci.total, 0);
      }
      discount = couponDiscount(coupon, eligibleTotal, { cartItems: items }) ?? 0;
    }
  }

  const tax = 0;
  const total = Math.max(0, subtotal + shippingCost + tax - discount);
  const isCod = paymentMethod === 'cod';
  const initialStatus = isCod ? 'pending_confirmation' : 'pending';
  const initialMessage = isCod
    ? 'Order placed. Awaiting admin confirmation (Cash on Delivery).'
    : `Order placed. Please send payment via ${paymentMethod === 'jazzcash' ? 'JazzCash' : 'Easypaisa'} and submit your transaction proof.`;

  // Reserve stock before creating the order so a failure leaves nothing behind
  const touchedProducts = new Map<string, Doc>();
  for (const item of finalItems) {
    const product = touchedProducts.get(item.product) ?? (await db.products.findById(item.product));
    if (!product || !product.isActive) throw new NotFoundError('Product');
    deductStock(product, item);
    touchedProducts.set(product._id, product);
  }
  for (const product of touchedProducts.values()) await db.products.save(product);

  const order = await db.orders.create({
    orderNumber: await nextOrderNumber(),
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
    tax,
    total,
    couponCode: couponCode ? String(couponCode).toUpperCase() : undefined,
    couponDiscount: discount,
    paymentMethod,
    paymentStatus: 'pending',
    status: initialStatus,
    notes,
    trackingHistory: [{ status: initialStatus, message: initialMessage, timestamp: new Date().toISOString() }],
    auditLog: [],
  });

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
  if (String(order.user) !== String(user!._id) && user!.role !== 'admin') {
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
    const newItems = [];
    for (const input of body.items) {
      const product = await loadProduct(input.product);
      if (!product || !product.isActive) throw new BadRequestError(`Product ${input.product} is invalid`);
      const priced = priceLine(product, input.variant, input.quantity);
      newSubtotal += priced.lineTotal;
      newProductDiscount += priced.productDiscount * input.quantity;
      newItems.push(priced);
      deductStock(product, { variant: input.variant, quantity: input.quantity, sku: priced.sku });
    }

    for (const p of products.values()) await db.products.save(p);
    order.items = newItems;
    order.subtotal = newSubtotal;
    order.productDiscount = newProductDiscount;
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
  order.total = Math.max(0, subtotal - (order.couponDiscount || 0) - manual + (order.shippingCost || 0) + (order.tax || 0));

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

orders.patch('/:orderId/status', adminOnly, validate(updateOrderStatusSchema), async ({ params, body }) => {
  const { status, message, trackingNumber, courierName, trackingUrl, estimatedDelivery, dispatchedAt, location } = body;
  const order = await db.orders.findById(params.orderId);
  if (!order) throw new NotFoundError('Order');

  const previousStatus = order.status;
  const now = new Date().toISOString();
  const codApproval = order.paymentMethod === 'cod' && order.status === 'pending_confirmation' && status === 'processing';

  order.status = status;
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

  await db.orders.save(order);

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

  return json({ success: true, message: 'Order status updated', data: order });
});

orders.delete('/:orderId', adminOnly, async ({ params }) => {
  const order = await db.orders.findById(params.orderId);
  if (!order) throw new NotFoundError('Order');
  if (order.status !== 'cancelled' && order.status !== 'refunded') await restockOrderItems(order.items ?? []);
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
