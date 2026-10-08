import crypto from 'crypto';
import postgres from 'postgres';

/**
 * Postgres (Supabase) access.
 *
 * Every table has the same shape: `_id text`, `data jsonb`, `created_at`,
 * `updated_at`. A document handed to route code is `{ _id, ...data }`, which
 * is exactly the JSON the old Express/Mongo API returned, so the storefront
 * and admin screens keep working unchanged.
 */

type Sql = postgres.Sql<Record<string, unknown>>;

const globalForDb = globalThis as unknown as { __azeeoraSql?: Sql };

export function getSql(): Sql {
  if (globalForDb.__azeeoraSql) return globalForDb.__azeeoraSql;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  const client = postgres(url, {
    // Supabase's transaction pooler (port 6543) does not support prepared statements
    prepare: false,
    max: isLocal ? 1 : 5,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: isLocal ? false : 'require',
  });
  globalForDb.__azeeoraSql = client;
  return client;
}

export type Doc = { _id: string; createdAt?: string; updatedAt?: string; [key: string]: any };
export type Filter = Record<string, any>;
export type SortSpec = Record<string, 1 | -1>;

/** 24-char hex id in the same format as a MongoDB ObjectId. */
export function newId(): string {
  const time = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
  return time + crypto.randomBytes(8).toString('hex');
}

export const isId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);

/** Strip undefined values and turn Dates into ISO strings, like Mongo's JSON. */
const toPlain = <T>(value: T): T => JSON.parse(JSON.stringify(value ?? null));

const toJsonb = (value: unknown) => JSON.stringify(value instanceof Date ? value.toISOString() : value);

const pathOf = (field: string) => field.split('.');

type Fragment = postgres.PendingQuery<postgres.Row[]> | postgres.Fragment;

function and(sql: Sql, parts: Fragment[]): Fragment {
  if (parts.length === 0) return sql`true`;
  return parts.slice(1).reduce((acc, p) => sql`${acc} and ${p}`, parts[0]);
}

function or(sql: Sql, parts: Fragment[]): Fragment {
  if (parts.length === 0) return sql`false`;
  return sql`(${parts.slice(1).reduce((acc, p) => sql`${acc} or ${p}`, parts[0])})`;
}

function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function fieldCondition(sql: Sql, field: string, cond: any): Fragment {
  if (field === '_id') {
    if (cond && typeof cond === 'object' && !Array.isArray(cond)) {
      const parts: Fragment[] = [];
      if ('$in' in cond) parts.push(sql`_id = any(${(cond.$in as unknown[]).map(String)})`);
      if ('$nin' in cond) parts.push(sql`not (_id = any(${(cond.$nin as unknown[]).map(String)}))`);
      if ('$ne' in cond) parts.push(sql`_id <> ${String(cond.$ne)}`);
      return and(sql, parts);
    }
    return sql`_id = ${String(cond)}`;
  }
  if (field === 'createdAt' || field === 'updatedAt') {
    const col = field === 'createdAt' ? sql`created_at` : sql`updated_at`;
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      const parts: Fragment[] = [];
      if (cond.$gte) parts.push(sql`${col} >= ${new Date(cond.$gte)}`);
      if (cond.$gt) parts.push(sql`${col} > ${new Date(cond.$gt)}`);
      if (cond.$lte) parts.push(sql`${col} <= ${new Date(cond.$lte)}`);
      if (cond.$lt) parts.push(sql`${col} < ${new Date(cond.$lt)}`);
      return and(sql, parts);
    }
  }

  const path = pathOf(field);
  const val = sql`(data #> ${path}::text[])`;

  const isOperatorObject =
    cond && typeof cond === 'object' && !Array.isArray(cond) && !(cond instanceof Date) &&
    Object.keys(cond).some((k) => k.startsWith('$'));

  if (!isOperatorObject) {
    if (cond === null || cond === undefined) return sql`(${val} is null or ${val} = 'null'::jsonb)`;
    // Mongo equality also matches an element inside an array field
    return sql`(${val} = ${toJsonb(cond)}::text::jsonb or (jsonb_typeof(${val}) = 'array' and ${val} @> ${JSON.stringify([toPlain(cond)])}::text::jsonb))`;
  }

  const parts: Fragment[] = [];
  for (const [op, arg] of Object.entries(cond)) {
    switch (op) {
      case '$eq':
        parts.push(fieldCondition(sql, field, arg));
        break;
      case '$ne':
        parts.push(
          arg === null
            ? sql`(${val} is not null and ${val} <> 'null'::jsonb)`
            : sql`(${val} is null or ${val} <> ${toJsonb(arg)}::text::jsonb)`
        );
        break;
      case '$in': {
        const list = (arg as unknown[]).map((v) => toJsonb(v));
        parts.push(
          sql`(${val} = any(${list}::text[]::jsonb[]) or (jsonb_typeof(${val}) = 'array' and exists (select 1 from jsonb_array_elements(${val}) e where e = any(${list}::text[]::jsonb[]))))`
        );
        break;
      }
      case '$nin': {
        const list = (arg as unknown[]).map((v) => toJsonb(v));
        parts.push(sql`(${val} is null or not (${val} = any(${list}::text[]::jsonb[])))`);
        break;
      }
      case '$gt':
        parts.push(sql`${val} > ${toJsonb(arg)}::text::jsonb`);
        break;
      case '$gte':
        parts.push(sql`${val} >= ${toJsonb(arg)}::text::jsonb`);
        break;
      case '$lt':
        parts.push(sql`${val} < ${toJsonb(arg)}::text::jsonb`);
        break;
      case '$lte':
        parts.push(sql`${val} <= ${toJsonb(arg)}::text::jsonb`);
        break;
      case '$exists':
        parts.push(arg ? sql`(${val} is not null and ${val} <> 'null'::jsonb)` : sql`(${val} is null or ${val} = 'null'::jsonb)`);
        break;
      case '$regex': {
        // Only anchored, case-insensitive exact matches are used by the API
        const raw = arg instanceof RegExp ? arg.source : String(arg);
        const exact = raw.replace(/^\^/, '').replace(/\$$/, '');
        parts.push(sql`lower(data #>> ${path}::text[]) = lower(${exact})`);
        break;
      }
      case '$contains':
        parts.push(sql`${val} @> ${JSON.stringify(toPlain(arg))}::text::jsonb`);
        break;
      default:
        throw new Error(`Unsupported filter operator ${op}`);
    }
  }
  return and(sql, parts);
}

export function buildWhere(sql: Sql, filter: Filter = {}): Fragment {
  const parts: Fragment[] = [];
  for (const [key, cond] of Object.entries(filter)) {
    if (cond === undefined) continue;
    if (key === '$or') {
      parts.push(or(sql, (cond as Filter[]).map((f) => buildWhere(sql, f))));
    } else if (key === '$and') {
      parts.push(and(sql, (cond as Filter[]).map((f) => buildWhere(sql, f))));
    } else if (key === '$text') {
      // Simple keyword search across name, description and tags
      const words = String(cond.$search ?? '').trim().split(/\s+/).filter(Boolean);
      const wordParts = words.map((w) => {
        const like = `%${escapeLike(w)}%`;
        return sql`(data->>'name' ilike ${like} or data->>'description' ilike ${like} or data->>'shortDescription' ilike ${like} or data->>'tags' ilike ${like})`;
      });
      parts.push(and(sql, wordParts));
    } else {
      parts.push(fieldCondition(sql, key, cond));
    }
  }
  return and(sql, parts);
}

function buildOrder(sql: Sql, sort?: SortSpec): Fragment {
  const entries = Object.entries(sort ?? { createdAt: -1 });
  if (entries.length === 0) return sql`order by created_at desc`;
  const parts = entries.map(([field, dir]) => {
    const col =
      field === 'createdAt'
        ? sql`created_at`
        : field === 'updatedAt'
          ? sql`updated_at`
          : field === '_id'
            ? sql`_id`
            : sql`(data #> ${pathOf(field)}::text[])`;
    return dir === -1 ? sql`${col} desc nulls last` : sql`${col} asc nulls last`;
  });
  return sql`order by ${parts.slice(1).reduce((acc, p) => sql`${acc}, ${p}`, parts[0])}, _id`;
}

const rowToDoc = (row: { _id: string; data: any }): Doc => ({ _id: row._id, ...(row.data ?? {}) });

export type FindOptions = { sort?: SortSpec; skip?: number; limit?: number };

export class Collection {
  constructor(public readonly table: string) {}

  private get sql() {
    return getSql();
  }

  async findById(id: unknown): Promise<Doc | null> {
    if (id === null || id === undefined || id === '') return null;
    const sql = this.sql;
    const rows = await sql`select _id, data from ${sql(this.table)} where _id = ${String(id)} limit 1`;
    return rows[0] ? rowToDoc(rows[0] as any) : null;
  }

  async findOne(filter: Filter = {}, opts: FindOptions = {}): Promise<Doc | null> {
    const docs = await this.find(filter, { ...opts, limit: 1 });
    return docs[0] ?? null;
  }

  async find(filter: Filter = {}, opts: FindOptions = {}): Promise<Doc[]> {
    const sql = this.sql;
    const where = buildWhere(sql, filter);
    const order = buildOrder(sql, opts.sort);
    const limit = opts.limit ? sql`limit ${opts.limit}` : sql``;
    const offset = opts.skip ? sql`offset ${opts.skip}` : sql``;
    const rows = await sql`select _id, data from ${sql(this.table)} where ${where} ${order} ${limit} ${offset}`;
    return rows.map((r) => rowToDoc(r as any));
  }

  async findByIds(ids: unknown[]): Promise<Doc[]> {
    const list = ids.filter((x) => x !== null && x !== undefined).map(String);
    if (list.length === 0) return [];
    const sql = this.sql;
    const rows = await sql`select _id, data from ${sql(this.table)} where _id = any(${list})`;
    return rows.map((r) => rowToDoc(r as any));
  }

  async count(filter: Filter = {}): Promise<number> {
    const sql = this.sql;
    const rows = await sql`select count(*)::int as n from ${sql(this.table)} where ${buildWhere(sql, filter)}`;
    return Number(rows[0]?.n ?? 0);
  }

  async create(input: Record<string, any>): Promise<Doc> {
    const sql = this.sql;
    const now = new Date().toISOString();
    const { _id, ...rest } = toPlain(input) as Doc;
    const id = isId(_id) ? _id : newId();
    const data = { ...rest, createdAt: rest.createdAt ?? now, updatedAt: rest.updatedAt ?? now };
    await sql`insert into ${sql(this.table)} (_id, data, created_at, updated_at)
      values (${id}, ${sql.json(data)}, ${data.createdAt}, ${data.updatedAt})`;
    return { _id: id, ...data };
  }

  /** Persist the whole document (the equivalent of Mongoose `doc.save()`). */
  async save(doc: Doc): Promise<Doc> {
    const sql = this.sql;
    const now = new Date().toISOString();
    const { _id, ...rest } = toPlain(doc) as Doc;
    const data = { ...rest, updatedAt: now };
    if (this.table === 'users') {
      // Counters are only ever changed atomically (members.ts). A full-document save
      // from a stale read must not put old values back, so keep what the row has.
      await sql`update users set data = ${sql.json(data)} || jsonb_strip_nulls(jsonb_build_object(
          'loyaltyPoints', data->'loyaltyPoints', 'monthlyBV', data->'monthlyBV', 'totalBV', data->'totalBV',
          'referredBV', data->'referredBV', 'lastMonthBV', data->'lastMonthBV', 'bvHistory', data->'bvHistory')),
        updated_at = ${now} where _id = ${_id}`;
    } else {
      await sql`update ${sql(this.table)} set data = ${sql.json(data)}, updated_at = ${now} where _id = ${_id}`;
    }
    Object.assign(doc, { updatedAt: now });
    return doc;
  }

  /** Shallow-merge top level fields (Mongoose `findByIdAndUpdate(id, patch)`). */
  async updateById(id: unknown, patch: Record<string, any>): Promise<Doc | null> {
    const doc = await this.findById(id);
    if (!doc) return null;
    const next = { ...doc, ...toPlain(patch), _id: doc._id };
    return this.save(next);
  }

  async updateMany(filter: Filter, patch: Record<string, any>): Promise<number> {
    const sql = this.sql;
    const now = new Date().toISOString();
    const merge = { ...toPlain(patch), updatedAt: now };
    const rows = await sql`update ${sql(this.table)} set data = data || ${sql.json(merge)}, updated_at = ${now}
      where ${buildWhere(sql, filter)} returning _id`;
    return rows.length;
  }

  async deleteById(id: unknown): Promise<Doc | null> {
    const sql = this.sql;
    const rows = await sql`delete from ${sql(this.table)} where _id = ${String(id)} returning _id, data`;
    return rows[0] ? rowToDoc(rows[0] as any) : null;
  }
}

export const db = {
  users: new Collection('users'),
  products: new Collection('products'),
  categories: new Collection('categories'),
  subcategories: new Collection('subcategories'),
  brands: new Collection('brands'),
  carts: new Collection('carts'),
  orders: new Collection('orders'),
  reviews: new Collection('reviews'),
  coupons: new Collection('coupons'),
  notifications: new Collection('notifications'),
  settings: new Collection('settings'),
  shippingRates: new Collection('shipping_rates'),
  walletEntries: new Collection('wallet_entries'),
  withdrawals: new Collection('withdrawals'),
  campaigns: new Collection('campaigns'),
  incentives: new Collection('incentives'),
  trainings: new Collection('trainings'),
  pickupPoints: new Collection('pickup_points'),
  stockMovements: new Collection('stock_movements'),
  blogPosts: new Collection('blog_posts'),
};

/**
 * Replace reference ids with the referenced documents, like Mongoose
 * `.populate()`. Missing references become `null`, as Mongoose does.
 */
export async function populate(
  docs: Doc[],
  field: string,
  collection: Collection,
  select?: string[]
): Promise<Doc[]> {
  const ids = Array.from(new Set(docs.map((d) => d?.[field]).filter((v) => typeof v === 'string')));
  if (ids.length === 0) return docs;
  const refs = await collection.findByIds(ids);
  const map = new Map(
    refs.map((r) => [
      r._id,
      select ? Object.fromEntries([['_id', r._id], ...select.filter((k) => k in r).map((k) => [k, r[k]])]) : r,
    ])
  );
  for (const d of docs) {
    if (typeof d?.[field] === 'string') d[field] = map.get(d[field]) ?? null;
  }
  return docs;
}

/** Populate category, subcategory and brand on products. */
export async function populateProducts(products: Doc[]): Promise<Doc[]> {
  await populate(products, 'category', db.categories);
  await populate(products, 'subcategory', db.subcategories);
  await populate(products, 'brand', db.brands);
  return products;
}
