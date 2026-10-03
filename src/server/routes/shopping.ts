import { z } from 'zod';
import { db, populateProducts, Doc } from '../db';
import { Router, json, validate, authenticate, BadRequestError, NotFoundError, ForbiddenError } from '../http';
import { applyProductDiscount, couponDiscount, couponIsValid, getMainImage } from '../commerce';

// ===========================================================================
// Cart
// ===========================================================================
export const cart = new Router();

const addItemSchema = z.object({
  productId: z.string().min(1),
  variant: z.string().optional(),
  quantity: z.number().int().min(1),
});
const updateQtySchema = z.object({ quantity: z.number().int().min(1) });
const couponApplySchema = z.object({ code: z.string().min(1).max(30) });

const emptyCart = { items: [], subtotal: 0, itemCount: 0, couponCode: undefined, couponDiscount: 0 };

const computeTotals = (items: any[]) => ({
  subtotal: items.reduce((s, i) => s + i.total, 0),
  itemCount: items.reduce((s, i) => s + i.quantity, 0),
});

const discountItems = (items: any[]) =>
  items.map((i) => ({ productId: String(i.product), quantity: i.quantity, unitPrice: i.price }));

async function resolveCartItem(input: z.infer<typeof addItemSchema>) {
  const product = await db.products.findById(input.productId);
  if (!product || !product.isActive) throw new NotFoundError('Product');
  if (product.isComingSoon) throw new BadRequestError('This product is coming soon.');

  const variants: any[] = product.variants ?? [];
  const variant = input.variant
    ? variants.find((v) => v.sku === input.variant || v.value === input.variant || v.name === input.variant)
    : variants.find((v) => v.isActive) ?? variants[0];

  const availableStock = variant ? variant.stock : product.stock;
  if (!availableStock || availableStock <= 0) throw new BadRequestError('Selected item is out of stock');
  if (input.quantity > availableStock) {
    throw new BadRequestError(`Quantity exceeds available stock (max ${availableStock})`);
  }

  const unitBasePrice = variant ? variant.price : product.basePrice;
  const unitPrice = applyProductDiscount(product, unitBasePrice);
  const image = variant?.images?.[0] ?? getMainImage(product);

  return {
    productId: product._id,
    variantSku: variant?.sku as string | undefined,
    name: product.name,
    image: image?.url ?? '',
    price: unitPrice,
    compareAtPrice: variant?.compareAtPrice ?? product.compareAtPrice ?? unitBasePrice,
    quantity: input.quantity,
    sku: variant?.sku ?? product.sku,
    slug: product.slug,
    maxQuantity: availableStock,
    total: unitPrice * input.quantity,
  };
}

async function getOrCreateCart(userId: string): Promise<Doc> {
  const existing = await db.carts.findOne({ user: userId });
  if (existing) return existing;
  return db.carts.create({ user: userId, items: [], subtotal: 0, itemCount: 0, couponDiscount: 0 });
}

async function recomputeCoupon(c: Doc, clearIfInvalid: boolean) {
  if (!c.couponCode) return;
  const coupon = await db.coupons.findOne({ code: c.couponCode });
  if (coupon && couponIsValid(coupon)) {
    c.couponDiscount = couponDiscount(coupon, c.subtotal, { cartItems: discountItems(c.items ?? []) }) ?? 0;
  } else if (clearIfInvalid) {
    c.couponDiscount = 0;
    delete c.couponCode;
  }
}

cart.get('/', authenticate, async ({ user }) => {
  const c = await db.carts.findOne({ user: user!._id });
  if (!c) return json({ success: true, message: 'Empty cart', data: emptyCart });
  return json({ success: true, message: 'Cart fetched', data: c });
});

cart.post('/items', authenticate, validate(addItemSchema), async ({ body, user }) => {
  const newItem = await resolveCartItem(body);
  const c = await getOrCreateCart(user!._id);
  c.items = c.items ?? [];

  const variantKey = newItem.variantSku ?? '';
  const existing = c.items.find(
    (i: any) => String(i.product) === String(newItem.productId) && String(i.variant ?? '') === variantKey
  );

  if (existing) {
    const mergedQty = existing.quantity + newItem.quantity;
    if (mergedQty > newItem.maxQuantity) {
      throw new BadRequestError(`Quantity exceeds available stock (max ${newItem.maxQuantity})`);
    }
    Object.assign(existing, {
      quantity: mergedQty,
      maxQuantity: newItem.maxQuantity,
      price: newItem.price,
      compareAtPrice: newItem.compareAtPrice,
      sku: newItem.sku,
      slug: newItem.slug,
      total: newItem.price * mergedQty,
    });
  } else {
    c.items.push({
      product: newItem.productId,
      variant: newItem.variantSku,
      name: newItem.name,
      image: newItem.image,
      price: newItem.price,
      compareAtPrice: newItem.compareAtPrice,
      quantity: newItem.quantity,
      sku: newItem.sku,
      slug: newItem.slug,
      maxQuantity: newItem.maxQuantity,
      total: newItem.total,
    });
  }

  Object.assign(c, computeTotals(c.items));
  await recomputeCoupon(c, true);
  await db.carts.save(c);
  return json({ success: true, message: 'Item added to cart', data: c });
});

cart.patch('/items/:productId', authenticate, validate(updateQtySchema), async ({ params, body, user }) => {
  const c = await db.carts.findOne({ user: user!._id });
  if (!c) throw new NotFoundError('Cart');
  const item = (c.items ?? []).find((i: any) => String(i.product) === String(params.productId));
  if (!item) throw new NotFoundError('Cart item');
  if (body.quantity > item.maxQuantity) {
    throw new BadRequestError(`Quantity exceeds available stock (max ${item.maxQuantity})`);
  }
  item.quantity = body.quantity;
  item.total = item.price * body.quantity;
  Object.assign(c, computeTotals(c.items));
  await recomputeCoupon(c, false);
  await db.carts.save(c);
  return json({ success: true, message: 'Cart updated', data: c });
});

cart.delete('/items/:productId', authenticate, async ({ params, user }) => {
  const c = await db.carts.findOne({ user: user!._id });
  if (!c) throw new NotFoundError('Cart');
  c.items = (c.items ?? []).filter((i: any) => String(i.product) !== String(params.productId));
  Object.assign(c, computeTotals(c.items), { couponDiscount: 0 });
  delete c.couponCode;
  await db.carts.save(c);
  return json({ success: true, message: 'Item removed', data: c });
});

cart.delete('/', authenticate, async ({ user }) => {
  const c = await db.carts.findOne({ user: user!._id });
  if (!c) return json({ success: true, message: 'Cart cleared', data: emptyCart });
  Object.assign(c, { items: [], subtotal: 0, itemCount: 0, couponDiscount: 0 });
  delete c.couponCode;
  await db.carts.save(c);
  return json({ success: true, message: 'Cart cleared', data: c });
});

cart.post('/coupon', authenticate, validate(couponApplySchema), async ({ body, user }) => {
  const code = String(body.code).trim().toUpperCase();
  const coupon = await db.coupons.findOne({ code });
  if (!coupon) throw new NotFoundError('Coupon');
  if (!couponIsValid(coupon)) throw new ForbiddenError('Coupon is not valid');

  const c = await db.carts.findOne({ user: user!._id });
  if (!c) throw new NotFoundError('Cart');
  if ((c.items ?? []).length === 0) throw new BadRequestError('Cart is empty');

  c.couponCode = code;
  c.couponDiscount =
    coupon.type === 'free_shipping' ? 0 : couponDiscount(coupon, c.subtotal, { cartItems: discountItems(c.items) }) ?? 0;
  await db.carts.save(c);
  return json({ success: true, message: 'Coupon applied', data: c });
});

// ===========================================================================
// Wishlist, compare, recently viewed
// ===========================================================================
export const wishlist = new Router();

async function activeProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const list = await db.products.find({ _id: { $in: ids }, isActive: true }, { sort: { createdAt: -1 } });
  return populateProducts(list);
}

async function requireActiveProduct(id: string) {
  const product = await db.products.findById(id);
  if (!product || !product.isActive) throw new NotFoundError('Product');
  return product;
}

async function requireUser(id: string) {
  const user = await db.users.findById(id);
  if (!user) throw new NotFoundError('User');
  return user;
}

wishlist.get('/', authenticate, async ({ user: me }) => {
  const user = await requireUser(me!._id);
  const data = await activeProductsByIds((user.wishlist ?? []).map(String));
  return json({ success: true, message: 'Wishlist fetched', data });
});

wishlist.get('/compare/list', authenticate, async ({ user: me }) => {
  const user = await requireUser(me!._id);
  const data = await activeProductsByIds((user.compare ?? []).map(String));
  return json({ success: true, message: 'Compare list fetched', data });
});

wishlist.get('/recently-viewed/list', authenticate, async ({ user: me }) => {
  const user = await requireUser(me!._id);
  const entries = [...(user.recentlyViewed ?? [])].sort(
    (a: any, b: any) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
  );
  const list = await activeProductsByIds(entries.map((e: any) => String(e.product)));
  const map = new Map(list.map((p) => [p._id, p]));
  const data = entries.map((e: any) => map.get(String(e.product))).filter(Boolean);
  return json({ success: true, message: 'Recently viewed fetched', data });
});

wishlist.post('/compare/:productId', authenticate, async ({ params, user: me }) => {
  await requireActiveProduct(params.productId);
  const user = await requireUser(me!._id);
  user.compare = (user.compare ?? []).map(String);
  if (!user.compare.includes(params.productId)) {
    user.compare = [...user.compare, params.productId].slice(-4);
    await db.users.save(user);
  }
  return json({ success: true, message: 'Added to compare', data: user.compare }, 201);
});

wishlist.delete('/compare/:productId', authenticate, async ({ params, user: me }) => {
  const user = await requireUser(me!._id);
  user.compare = (user.compare ?? []).map(String).filter((id: string) => id !== params.productId);
  await db.users.save(user);
  return json({ success: true, message: 'Removed from compare', data: user.compare });
});

wishlist.post('/recently-viewed/:productId', authenticate, async ({ params, user: me }) => {
  await requireActiveProduct(params.productId);
  const user = await requireUser(me!._id);
  const filtered = (user.recentlyViewed ?? []).filter((x: any) => String(x.product) !== params.productId);
  user.recentlyViewed = [...filtered, { product: params.productId, viewedAt: new Date().toISOString() }].slice(-10);
  await db.users.save(user);
  return json({ success: true, message: 'Recently viewed updated' }, 201);
});

wishlist.post('/:productId', authenticate, async ({ params, user: me }) => {
  await requireActiveProduct(params.productId);
  const user = await requireUser(me!._id);
  user.wishlist = (user.wishlist ?? []).map(String);
  if (!user.wishlist.includes(params.productId)) {
    user.wishlist.push(params.productId);
    await db.users.save(user);
  }
  return json({ success: true, message: 'Added to wishlist', data: user.wishlist }, 201);
});

wishlist.delete('/:productId', authenticate, async ({ params, user: me }) => {
  const user = await requireUser(me!._id);
  user.wishlist = (user.wishlist ?? []).map(String).filter((id: string) => id !== params.productId);
  await db.users.save(user);
  return json({ success: true, message: 'Removed from wishlist', data: user.wishlist });
});
