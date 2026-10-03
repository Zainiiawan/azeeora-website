/**
 * One-off copy of every MongoDB collection into the Supabase Postgres tables.
 *
 *   MONGODB_URI="mongodb+srv://..." DATABASE_URL="postgresql://..." \
 *     node scripts/migrate-mongo-to-supabase.mjs [--dry-run]
 *
 * - Keeps every original _id (24-char hex), so links, orders and reviews stay intact.
 * - ObjectIds become hex strings, Dates become ISO strings, `__v` is dropped.
 * - Safe to re-run: rows are upserted by _id.
 * - Prints Mongo vs Postgres counts per collection at the end.
 */
import { MongoClient, ObjectId } from 'mongodb';
import postgres from 'postgres';

const DRY = process.argv.includes('--dry-run');
const { MONGODB_URI, DATABASE_URL } = process.env;
if (!MONGODB_URI || (!DATABASE_URL && !DRY)) {
  console.error('Set MONGODB_URI and DATABASE_URL');
  process.exit(1);
}

// Mongo collection name -> Postgres table
const COLLECTIONS = {
  users: 'users',
  categories: 'categories',
  subcategories: 'subcategories',
  brands: 'brands',
  products: 'products',
  carts: 'carts',
  orders: 'orders',
  reviews: 'reviews',
  coupons: 'coupons',
  notifications: 'notifications',
  settings: 'settings',
  shippingrates: 'shipping_rates',
};

function clean(value) {
  if (value instanceof ObjectId) return value.toHexString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    if (value._bsontype === 'Decimal128') return Number(value.toString());
    if (value._bsontype === 'Long' || value._bsontype === 'Int32' || value._bsontype === 'Double') return Number(value);
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === '__v' || v === undefined) continue;
      out[k] = clean(v);
    }
    return out;
  }
  return value;
}

const mongo = new MongoClient(MONGODB_URI);
await mongo.connect();
const mdb = mongo.db(process.env.MONGODB_DB || undefined);
const existing = new Set((await mdb.listCollections().toArray()).map((c) => c.name));
console.log(`Mongo database: ${mdb.databaseName}, collections: ${[...existing].join(', ')}`);

const sql = DRY ? null : postgres(DATABASE_URL, { prepare: false, max: 1, ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : 'require' });
const report = [];

for (const [collection, table] of Object.entries(COLLECTIONS)) {
  if (!existing.has(collection)) {
    report.push({ collection, mongo: 0, postgres: '-', note: 'not in Mongo' });
    continue;
  }
  const docs = await mdb.collection(collection).find({}).toArray();
  let written = 0;
  for (const raw of docs) {
    const { _id, ...rest } = clean(raw);
    const now = new Date().toISOString();
    const data = { ...rest, createdAt: rest.createdAt ?? now, updatedAt: rest.updatedAt ?? rest.createdAt ?? now };
    if (collection === 'users' && data.email) data.email = String(data.email).toLowerCase().trim();
    if (DRY) {
      written++;
      continue;
    }
    await sql`
      insert into ${sql(table)} (_id, data, created_at, updated_at)
      values (${String(_id)}, ${sql.json(data)}, ${data.createdAt}, ${data.updatedAt})
      on conflict (_id) do update set data = excluded.data, created_at = excluded.created_at, updated_at = excluded.updated_at`;
    written++;
  }
  const pgCount = DRY ? '(dry run)' : Number((await sql`select count(*)::int n from ${sql(table)}`)[0].n);
  report.push({ collection, mongo: docs.length, postgres: pgCount, written });
}

console.table(report);
const mismatched = report.filter((r) => typeof r.postgres === 'number' && r.postgres < r.mongo);
await mongo.close();
if (sql) await sql.end();
if (mismatched.length) {
  console.error('Some collections did not fully copy:', mismatched.map((r) => r.collection).join(', '));
  process.exit(1);
}
console.log(DRY ? 'Dry run complete.' : 'Migration complete. All counts match.');
