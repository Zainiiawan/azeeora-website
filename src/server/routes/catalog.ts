import { z } from 'zod';
import slugify from 'slugify';
import { db, isId, populateProducts, Doc } from '../db';
import { Router, json, validate, adminOnly, NotFoundError } from '../http';
import {
  createProductSchema,
  productFilterSchema,
  updateProductSchema,
  createCategorySchema,
  createBrandSchema,
} from '../shared';

const makeSlug = (name: string) => slugify(name, { lower: true, strict: true });

// ===========================================================================
// Products
// ===========================================================================
export const products = new Router();

const productSortMap: Record<string, Record<string, 1 | -1>> = {
  price_asc: { basePrice: 1 },
  price_desc: { basePrice: -1 },
  rating: { rating: -1 },
  newest: { createdAt: -1 },
  bestselling: { soldCount: -1 },
  name_asc: { name: 1 },
};

const autocompleteSchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(20).optional().default(8),
});

/** Defaults the old Mongoose Product schema filled in. */
const productDefaults = (input: Record<string, any>) => ({
  images: [],
  variants: [],
  stock: 0,
  lowStockThreshold: 30,
  tags: [],
  attributes: {},
  isFeatured: false,
  isActive: true,
  isComingSoon: false,
  rating: 0,
  reviewCount: 0,
  soldCount: 0,
  seo: {},
  ...input,
});

const normalizeProduct = (input: Record<string, any>) => {
  const out = { ...input };
  if (typeof out.sku === 'string') out.sku = out.sku.toUpperCase();
  if (Array.isArray(out.tags)) out.tags = out.tags.map((t: string) => String(t).toLowerCase());
  return out;
};

products.get('/autocomplete', validate(autocompleteSchema, 'query'), async ({ query }) => {
  const search = String(query.search ?? '').trim();
  const limit = Number(query.limit ?? 8);
  if (!search) return json({ success: true, message: 'Autocomplete', data: { items: [] } });

  const items = await db.products.find(
    { isActive: true, $text: { $search: search } },
    { sort: { soldCount: -1 }, limit }
  );
  return json({
    success: true,
    message: 'Autocomplete results',
    data: { items: items.map((p) => ({ _id: p._id, name: p.name, slug: p.slug })) },
  });
});

products.get('/', validate(productFilterSchema, 'query'), async ({ query }) => {
  const { category, subcategory, brand, minPrice, maxPrice, rating, tags, inStock, isFeatured, search, sortBy, page, limit } =
    query as any;

  const filter: Record<string, any> = { isActive: true };
  if (category) filter.category = String(category);
  if (subcategory) filter.subcategory = String(subcategory);
  if (brand) filter.brand = String(brand);
  if (typeof minPrice === 'number') filter.basePrice = { ...(filter.basePrice ?? {}), $gte: minPrice };
  if (typeof maxPrice === 'number') filter.basePrice = { ...(filter.basePrice ?? {}), $lte: maxPrice };
  if (typeof rating === 'number') filter.rating = { $gte: rating };
  if (inStock === true) filter.stock = { $gt: 0 };
  if (typeof isFeatured === 'boolean') filter.isFeatured = isFeatured;
  if (tags) {
    const tagList = String(tags).split(',').map((t) => t.trim()).filter(Boolean);
    if (tagList.length > 0) filter.tags = { $in: tagList };
  }
  if (search) filter.$text = { $search: String(search) };

  const sort = sortBy ? productSortMap[sortBy] : { createdAt: -1 as const };
  const skip = (page - 1) * limit;

  const [total, items] = await Promise.all([
    db.products.count(filter),
    db.products.find(filter, { sort, skip, limit }),
  ]);
  await populateProducts(items);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  return json({
    success: true,
    message: 'Products fetched',
    data: {
      products: items,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    },
  });
});

products.get('/:slug', async ({ params }) => {
  const slug = params.slug;
  const filter = isId(slug) ? { $or: [{ _id: slug }, { slug }], isActive: true } : { slug, isActive: true };
  const product = await db.products.findOne(filter);
  if (!product) throw new NotFoundError('Product');
  await populateProducts([product]);
  return json({ success: true, message: 'Product fetched', data: product });
});

products.post('/', adminOnly, validate(createProductSchema), async ({ body }) => {
  const input = normalizeProduct(body);
  if (!input.slug && input.name) input.slug = makeSlug(input.name);
  const created = await db.products.create(productDefaults(input));
  return json({ success: true, message: 'Product created', data: created }, 201);
});

products.put('/:productId', adminOnly, validate(updateProductSchema), async ({ params, body }) => {
  const updated = await db.products.updateById(params.productId, normalizeProduct(body));
  if (!updated) throw new NotFoundError('Product');
  return json({ success: true, message: 'Product updated', data: updated });
});

products.delete('/:productId', adminOnly, async ({ params }) => {
  const updated = await db.products.updateById(params.productId, { isActive: false });
  if (!updated) throw new NotFoundError('Product');
  return json({ success: true, message: 'Product disabled' });
});

// ===========================================================================
// Categories
// ===========================================================================
export const categories = new Router();

const createSubcategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  image: z.object({ url: z.string().url(), publicId: z.string(), alt: z.string().optional() }).optional(),
  isActive: z.boolean().optional().default(true),
  order: z.number().int().optional().default(0),
});

categories.get('/', async () => {
  const cats = await db.categories.find({ isActive: true }, { sort: { order: 1, createdAt: -1 } });
  const counts = await Promise.all(
    cats.map((c) => db.products.count({ category: c._id, isActive: true }))
  );
  return json({
    success: true,
    message: 'Categories fetched',
    data: cats.map((c, i) => ({ ...c, productCount: counts[i] })),
  });
});

categories.get('/:slug', async ({ params }) => {
  const category = await db.categories.findOne({ slug: params.slug, isActive: true });
  if (!category) throw new NotFoundError('Category');
  const subcategories = await db.subcategories.find(
    { category: category._id, isActive: true },
    { sort: { order: 1, createdAt: -1 } }
  );
  return json({ success: true, message: 'Category fetched', data: { category, subcategories } });
});

categories.post('/', adminOnly, validate(createCategorySchema), async ({ body }) => {
  const created = await db.categories.create({
    isActive: true,
    order: 0,
    ...body,
    slug: body.slug || makeSlug(body.name),
  });
  return json({ success: true, message: 'Category created', data: created }, 201);
});

categories.put('/:categoryId', adminOnly, validate(createCategorySchema.partial()), async ({ params, body }) => {
  const updated = await db.categories.updateById(params.categoryId, body);
  if (!updated) throw new NotFoundError('Category');
  return json({ success: true, message: 'Category updated', data: updated });
});

categories.delete('/:categoryId', adminOnly, async ({ params }) => {
  const updated = await db.categories.updateById(params.categoryId, { isActive: false });
  if (!updated) throw new NotFoundError('Category');
  return json({ success: true, message: 'Category disabled' });
});

categories.post('/:categoryId/subcategories', adminOnly, validate(createSubcategorySchema), async ({ params, body }) => {
  const category = await db.categories.findById(params.categoryId);
  if (!category || !category.isActive) throw new NotFoundError('Category');
  const created = await db.subcategories.create({
    ...body,
    slug: makeSlug(body.name),
    category: category._id,
  });
  return json({ success: true, message: 'Subcategory created', data: created }, 201);
});

// ===========================================================================
// Brands
// ===========================================================================
export const brands = new Router();

brands.get('/', async () => {
  const list = await db.brands.find({ isActive: true }, { sort: { createdAt: -1 } });
  return json({ success: true, message: 'Brands fetched', data: list });
});

brands.get('/:slug', async ({ params }) => {
  const brand = await db.brands.findOne({ slug: params.slug, isActive: true });
  if (!brand) throw new NotFoundError('Brand');
  return json({ success: true, message: 'Brand fetched', data: brand });
});

brands.post('/', adminOnly, validate(createBrandSchema), async ({ body }) => {
  const created = await db.brands.create({ isActive: true, ...body, slug: body.slug || makeSlug(body.name) });
  return json({ success: true, message: 'Brand created', data: created }, 201);
});

brands.put('/:brandId', adminOnly, validate(createBrandSchema.partial()), async ({ params, body }) => {
  const updated = await db.brands.updateById(params.brandId, body);
  if (!updated) throw new NotFoundError('Brand');
  return json({ success: true, message: 'Brand updated', data: updated });
});

brands.delete('/:brandId', adminOnly, async ({ params }) => {
  const updated = await db.brands.updateById(params.brandId, { isActive: false });
  if (!updated) throw new NotFoundError('Brand');
  return json({ success: true, message: 'Brand disabled' });
});

export type { Doc };
