import { z } from 'zod';
import xss from 'xss';
import nodemailer from 'nodemailer';
import { db, populate } from '../db';
import {
  Router,
  json,
  validate,
  authenticate,
  optionalAuthenticate,
  adminOnly,
  rateLimit,
  publicUser,
  AppError,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../http';
import { couponDiscount, couponIsValid, getSettings, refreshProductRating } from '../commerce';
import {
  createReviewSchema,
  updateReviewModerationSchema,
  createCouponSchema,
  applyCouponSchema,
  STORE_CONTACT,
} from '../shared';
import { sendAdminReplyEmail } from '../email';
import { logger } from '../logger';

// ===========================================================================
// Reviews
// ===========================================================================
export const reviews = new Router();

reviews.get('/admin/all', adminOnly, async () => {
  const list = await db.reviews.find({}, { sort: { createdAt: -1 }, limit: 500 });
  await populate(list, 'user', db.users, ['firstName', 'lastName', 'email']);
  await populate(list, 'product', db.products, ['name', 'slug']);
  return json({ success: true, message: 'All reviews fetched', data: list });
});

reviews.get('/:productId/stats', async ({ params }) => {
  const list = await db.reviews.find({ product: params.productId, isApproved: true });
  const totalReviews = list.length;
  const averageRating = totalReviews === 0 ? 0 : list.reduce((s, r) => s + Number(r.rating), 0) / totalReviews;
  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of list) ratingDistribution[r.rating] = (ratingDistribution[r.rating] ?? 0) + 1;
  return json({ success: true, message: 'Review stats fetched', data: { averageRating, totalReviews, ratingDistribution } });
});

reviews.get('/:productId', async ({ params }) => {
  const list = await db.reviews.find({ product: params.productId, isApproved: true }, { sort: { createdAt: -1 } });
  await populate(list, 'user', db.users, ['firstName', 'lastName', 'avatar']);
  return json({ success: true, message: 'Reviews fetched', data: list });
});

const reviewLimiter = rateLimit(
  'review',
  60 * 60 * 1000,
  5,
  'Too many reviews submitted from this IP, please try again after an hour'
);

reviews.post('/', reviewLimiter, optionalAuthenticate, validate(createReviewSchema), async ({ body, user }) => {
  const { product, rating, title, images, guestName, guestEmail } = body;
  const userId = user?._id;
  if (!userId && (!guestName || !guestEmail)) {
    throw new BadRequestError('Guest name and email are required if not logged in');
  }

  const productDoc = await db.products.findById(product);
  if (!productDoc || !productDoc.isActive) throw new NotFoundError('Product');

  if (userId) {
    if (await db.reviews.findOne({ product, user: userId })) {
      throw new BadRequestError('You have already reviewed this product');
    }
  } else if (await db.reviews.findOne({ product, guestEmail: guestEmail.toLowerCase() })) {
    throw new BadRequestError('A review has already been submitted with this email for this product');
  }

  let hasPurchase = false;
  if (userId) {
    const order = await db.orders.findOne({
      user: userId,
      items: { $contains: [{ product }] },
      paymentStatus: { $in: ['paid', 'partially_refunded'] },
      status: { $nin: ['cancelled', 'refunded', 'returned'] },
    });
    hasPurchase = Boolean(order);
  }

  const created = await db.reviews.create({
    product,
    user: userId,
    guestName: userId ? undefined : guestName,
    guestEmail: userId ? undefined : guestEmail.toLowerCase(),
    rating,
    title: xss(title),
    body: xss(body.body),
    images: images ?? [],
    isVerifiedPurchase: hasPurchase,
    isApproved: true, // auto-approve so reviews show immediately (unchanged)
    helpfulVotes: 0,
    helpfulVoters: [],
  });

  await refreshProductRating(product);
  return json({ success: true, message: 'Review submitted successfully', data: created }, 201);
});

reviews.post('/:reviewId/helpful', authenticate, async ({ params, user }) => {
  const review = await db.reviews.findById(params.reviewId);
  if (!review) throw new NotFoundError('Review');
  const userId = String(user!._id);
  const voters: string[] = (review.helpfulVoters ?? []).map(String);
  if (voters.includes(userId)) {
    review.helpfulVoters = voters.filter((id) => id !== userId);
    review.helpfulVotes = Math.max(0, (review.helpfulVotes ?? 0) - 1);
  } else {
    review.helpfulVoters = [...voters, userId];
    review.helpfulVotes = (review.helpfulVotes ?? 0) + 1;
  }
  await db.reviews.save(review);
  return json({ success: true, message: 'Helpful vote updated', data: review });
});

reviews.patch('/:reviewId/moderate', adminOnly, validate(updateReviewModerationSchema), async ({ params, body }) => {
  const review = await db.reviews.findById(params.reviewId);
  if (!review) throw new NotFoundError('Review');
  review.isApproved = body.isApproved;
  review.moderationNote = body.moderationNote;
  await db.reviews.save(review);
  await refreshProductRating(review.product);
  return json({ success: true, message: 'Review moderation updated', data: review });
});

reviews.delete('/:reviewId', adminOnly, async ({ params }) => {
  const review = await db.reviews.findById(params.reviewId);
  if (!review) throw new NotFoundError('Review');
  await db.reviews.deleteById(review._id);
  await refreshProductRating(review.product);
  return json({ success: true, message: 'Review deleted successfully' });
});

reviews.patch('/:reviewId/reply', adminOnly, async ({ params, body }) => {
  const text = body?.body;
  if (!text || typeof text !== 'string' || text.trim().length === 0) throw new BadRequestError('Reply body is required');

  const review = await db.reviews.findById(params.reviewId);
  if (!review) throw new NotFoundError('Review');
  review.adminReply = { body: xss(text.trim()), createdAt: new Date().toISOString() };
  await db.reviews.save(review);

  const [reviewer, product] = await Promise.all([
    review.user ? db.users.findById(review.user) : null,
    db.products.findById(review.product),
  ]);
  const email = reviewer?.email ?? review.guestEmail;
  if (email) {
    try {
      await sendAdminReplyEmail(
        email,
        reviewer?.firstName || review.guestName || 'Valued Customer',
        product?.name ?? 'our product',
        product?.slug ?? '',
        review.adminReply.body
      );
    } catch (e) {
      logger.error('Failed to send admin reply email', e);
    }
  }

  const data = { ...review, user: reviewer ? publicUser(reviewer) : review.user ?? null, product: product ?? null };
  return json({ success: true, message: 'Reply added successfully', data });
});

// ===========================================================================
// Coupons
// ===========================================================================
export const coupons = new Router();

coupons.get('/', adminOnly, async () => {
  const list = await db.coupons.find({}, { sort: { createdAt: -1 }, limit: 500 });
  return json({ success: true, message: 'Coupons fetched', data: list });
});

coupons.post('/validate', validate(applyCouponSchema), async ({ body }) => {
  const coupon = await db.coupons.findOne({ code: String(body.code).toUpperCase() });
  if (!coupon || !couponIsValid(coupon)) {
    return json({ success: true, message: 'Coupon validation', data: { isValid: false, discount: 0 } });
  }
  const discount = coupon.type === 'free_shipping' ? 0 : couponDiscount(coupon, body.cartTotal);
  return json({ success: true, message: 'Coupon validation', data: { isValid: true, discount, coupon } });
});

coupons.post('/', adminOnly, validate(createCouponSchema), async ({ body }) => {
  const created = await db.coupons.create({
    usageCount: 0,
    usedBy: [],
    isActive: true,
    ...body,
    code: String(body.code).toUpperCase(),
  });
  return json({ success: true, message: 'Coupon created', data: created }, 201);
});

coupons.put('/:couponId', adminOnly, validate(createCouponSchema.partial()), async ({ params, body }) => {
  const patch = { ...body };
  if (patch.code) patch.code = String(patch.code).toUpperCase();
  const updated = await db.coupons.updateById(params.couponId, patch);
  if (!updated) throw new NotFoundError('Coupon');
  return json({ success: true, message: 'Coupon updated', data: updated });
});

coupons.delete('/:couponId', adminOnly, async ({ params }) => {
  const updated = await db.coupons.updateById(params.couponId, { isActive: false });
  if (!updated) throw new NotFoundError('Coupon');
  return json({ success: true, message: 'Coupon disabled' });
});

// ===========================================================================
// Users (admin customer list)
// ===========================================================================
export const users = new Router();

users.get('/', adminOnly, async ({ query }) => {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  const settings = await getSettings();
  const vipThreshold = settings.vipThreshold || 5000;

  const [total, list] = await Promise.all([
    db.users.count(),
    db.users.find({}, { sort: { createdAt: -1 }, skip: (page - 1) * limit, limit }),
  ]);

  const data = await Promise.all(
    list.map(async (u) => {
      const userOrders = await db.orders.find({ user: u._id, status: { $nin: ['cancelled', 'refunded'] } });
      const totalSpent = userOrders.reduce((s, o) => s + Number(o.total || 0), 0);
      const { password: _pw, ...rest } = u;
      return { ...rest, totalSpent, ordersCount: userOrders.length, isVip: totalSpent >= vipThreshold };
    })
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return json({ success: true, message: 'Users fetched', data: { users: data, pagination: { page, limit, total, totalPages } } });
});

users.patch('/:userId/role', adminOnly, validate(z.object({ role: z.enum(['admin', 'customer', 'warehouse']) })), async ({ params, body }) => {
  const user = await db.users.updateById(params.userId, { role: body.role });
  if (!user) throw new NotFoundError('User');
  return json({ success: true, message: 'Role updated', data: publicUser(user) });
});

users.patch('/:userId/activate', adminOnly, async ({ params, body }) => {
  if (typeof body?.isActive !== 'boolean') throw new BadRequestError('isActive must be boolean');
  const user = await db.users.updateById(params.userId, { isActive: body.isActive });
  if (!user) throw new NotFoundError('User');
  return json({ success: true, message: 'User updated', data: publicUser(user) });
});

users.delete('/:userId', adminOnly, async ({ params }) => {
  const user = await db.users.findById(params.userId);
  if (!user) throw new NotFoundError('User');
  if (user.role === 'admin') throw new BadRequestError('Cannot delete admin users');
  await db.users.deleteById(user._id);
  return json({ success: true, message: 'User deleted successfully', data: { _id: user._id } });
});

// ===========================================================================
// Notifications
// ===========================================================================
export const notifications = new Router();

notifications.get('/', authenticate, async ({ query, user }) => {
  const limit = Math.min(Number(query.limit ?? 30), 100);
  const filter: Record<string, unknown> = { user: user!._id };
  if (query.unreadOnly === 'true') filter.isRead = false;
  const [items, unreadCount] = await Promise.all([
    db.notifications.find(filter, { sort: { createdAt: -1 }, limit }),
    db.notifications.count({ user: user!._id, isRead: false }),
  ]);
  return json({ success: true, message: 'Notifications fetched', data: { items, unreadCount } });
});

notifications.patch('/read-all', authenticate, async ({ user }) => {
  await db.notifications.updateMany({ user: user!._id, isRead: false }, { isRead: true });
  return json({ success: true, message: 'All notifications marked as read' });
});

notifications.patch('/:id/read', authenticate, async ({ params, user }) => {
  const notif = await db.notifications.findOne({ _id: params.id, user: user!._id });
  if (!notif) throw new NotFoundError('Notification');
  notif.isRead = true;
  await db.notifications.save(notif);
  return json({ success: true, message: 'Notification marked as read', data: notif });
});

// ===========================================================================
// Contact form
// ===========================================================================
export const contact = new Router();

const contactSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional(),
  subject: z.string().min(3).max(150),
  message: z.string().min(10).max(2000),
});

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

contact.post(
  '/',
  rateLimit('contact', 60 * 60 * 1000, 10, 'Too many messages. Please try again later.'),
  validate(contactSchema),
  async ({ body }) => {
    const { name, email, phone, subject, message } = body;
    const user = (process.env.EMAIL_USER || '').trim();
    const pass = (process.env.EMAIL_PASSWORD || '').replace(/\s+/g, '');
    if (!user || !pass) {
      logger.warn('Contact form submitted but SMTP not configured');
      return json({ success: false, message: 'Contact form is temporarily unavailable. Please call us directly.' }, 503);
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || user,
      to: process.env.ADMIN_EMAIL || STORE_CONTACT.email,
      replyTo: email,
      subject: `[AZEEORA Contact] ${subject}`,
      html: `
        <h2>New Contact Message</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <hr/>
        <p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
      `,
    });

    return json({ success: true, message: 'Message sent successfully. We will reply soon.' }, 201);
  }
);

// ===========================================================================
// Analytics
// ===========================================================================
export const analytics = new Router();

analytics.get('/summary', adminOnly, async () => {
  const [paid, allOrders, top, activeProducts] = await Promise.all([
    db.orders.find({ paymentStatus: { $in: ['paid', 'partially_refunded'] } }),
    db.orders.find({}),
    db.products.find({ isActive: true }, { sort: { soldCount: -1 }, limit: 10 }),
    db.products.find({ isActive: true }),
  ]);

  const ordersByStatus: Record<string, number> = {};
  for (const o of allOrders) ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;

  return json({
    success: true,
    message: 'Analytics summary fetched',
    data: {
      revenue: paid.reduce((s, o) => s + Number(o.total || 0), 0),
      paidOrders: paid.length,
      ordersByStatus,
      topProducts: top.map((p) => ({
        _id: p._id,
        name: p.name,
        slug: p.slug,
        soldCount: p.soldCount,
        rating: p.rating,
        reviewCount: p.reviewCount,
        basePrice: p.basePrice,
      })),
      lowStockCount: activeProducts.filter((p) => (p.stock ?? 0) < (p.lowStockThreshold ?? 30)).length,
    },
  });
});

// ===========================================================================
// Shipping rates + store settings
// ===========================================================================
export const shipping = new Router();

const shippingRateSchema = z.object({ city: z.string().min(1), cost: z.number().min(0), isActive: z.boolean().optional() });
const titleCity = (city: string) => city.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

shipping.get('/', async () => {
  const rates = await db.shippingRates.find({}, { sort: { city: 1 } });
  return json({ success: true, message: 'Shipping rates fetched', data: rates });
});

shipping.post('/', adminOnly, validate(shippingRateSchema), async ({ body }) => {
  const city = titleCity(body.city);
  if (await db.shippingRates.findOne({ city: { $regex: `^${city}$` } })) {
    throw new BadRequestError('Shipping rate for this city already exists');
  }
  const rate = await db.shippingRates.create({ city, cost: body.cost, isActive: body.isActive ?? true });
  return json({ success: true, message: 'Shipping rate created', data: rate }, 201);
});

shipping.put('/:id', adminOnly, validate(shippingRateSchema), async ({ params, body }) => {
  const city = titleCity(body.city);
  if (await db.shippingRates.findOne({ city: { $regex: `^${city}$` }, _id: { $ne: params.id } })) {
    throw new BadRequestError('Shipping rate for this city already exists');
  }
  const patch: Record<string, unknown> = { city, cost: body.cost };
  if (body.isActive !== undefined) patch.isActive = body.isActive;
  const rate = await db.shippingRates.updateById(params.id, patch);
  if (!rate) throw new NotFoundError('Shipping Rate');
  return json({ success: true, message: 'Shipping rate updated', data: rate });
});

shipping.delete('/:id', adminOnly, async ({ params }) => {
  const rate = await db.shippingRates.deleteById(params.id);
  if (!rate) throw new NotFoundError('Shipping Rate');
  return json({ success: true, message: 'Shipping rate deleted' });
});

export const settings = new Router();

const settingsSchema = z.object({
  defaultShippingCost: z.number().min(0),
  freeShippingThreshold: z.number().min(0),
  vipThreshold: z.number().min(0).optional(),
});

settings.get('/', async () => json({ success: true, message: 'Settings fetched', data: await getSettings() }));

settings.put('/', adminOnly, validate(settingsSchema), async ({ body }) => {
  const current = await getSettings();
  const updated = await db.settings.updateById(current._id, body);
  return json({ success: true, message: 'Settings updated', data: updated });
});

export { AppError, ForbiddenError };
