// Regression checks for the pre-launch audit fixes. Run after members-e2e.mjs.
import postgres from 'postgres';
import crypto from 'crypto';

const BASE = process.env.BASE || 'http://localhost:3100';
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
let pass = 0, fail = 0;
const ok = (c, l, x) => { if (c) { pass++; console.log('PASS ', l); } else { fail++; console.log('FAIL ', l, x ?? ''); } };
async function call(method, path, body, token) {
  const res = await fetch(BASE + '/api' + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await res.json(); } catch {}
  return { status: res.status, ...j };
}
const login = async (email) => (await call('POST', '/auth/login', { email, password: 'Test#12345' })).data?.tokens?.accessToken;
const admin = await login('e2e-admin@test.local');
const alice = await login('e2e-alice@test.local');
const bob = await login('e2e-bob@test.local');
const P = (await call('GET', '/products?limit=5')).data.products[0];
const ship = { firstName: 'T', lastName: 'Tester', phone: '03001234567', street: '1 Test Road', city: 'Lahore', state: 'Punjab', postalCode: '54000', country: 'Pakistan' };
const guest = (email, phone = '03119998888') => ({ firstName: 'Guest', lastName: 'Buyer', email, phone });

// --- last unit race ------------------------------------------------------------------
const stock0 = (await call('GET', `/products/${P.slug}`)).data.stock;
await sql`update products set data = jsonb_set(data, '{stock}', '1') where _id = ${P._id}`;
const race = await Promise.all([1, 2, 3].map((i) => call('POST', '/orders', { items: [{ productId: P._id, quantity: 1 }], shippingAddress: ship, paymentMethod: 'cod', guestInfo: guest(`e2e-race${i}@test.local`) })));
const won = race.filter((r) => r.status === 201);
const after = (await call('GET', `/products/${P.slug}`)).data.stock;
ok(won.length === 1 && after === 0, 'only one buyer gets the last unit, stock never negative', { won: won.length, after, msgs: race.map((r) => r.message) });
for (const w of won) await call('PATCH', `/orders/${w.data._id}/status`, { status: 'cancelled' }, admin);
ok((await call('GET', `/products/${P.slug}`)).data.stock === 1, 'cancel returns the unit');
await sql`update products set data = jsonb_set(data, '{stock}', to_jsonb(${stock0}::int)) where _id = ${P._id}`;

// --- closed orders stay closed -------------------------------------------------------
let r = await call('POST', '/orders', { items: [{ productId: P._id, quantity: 1 }], shippingAddress: ship, paymentMethod: 'cod' }, bob);
const o1 = r.data;
await call('PATCH', `/orders/${o1._id}/status`, { status: 'cancelled' }, admin);
r = await call('PATCH', `/orders/${o1._id}/status`, { status: 'processing' }, admin);
ok(r.status === 400, 'a cancelled order cannot be reopened');
r = await call('PATCH', `/orders/${o1._id}/admin-edit`, { items: [{ product: P._id, quantity: 2 }] }, admin);
ok(r.status === 400, 'a cancelled order cannot be edited');

// --- quantities ------------------------------------------------------------------------
r = await call('POST', '/orders/quote', { items: [{ productId: P._id, quantity: 1.5 }] });
ok(r.status === 422, 'half quantities are refused');
r = await call('POST', '/orders/quote', { items: [{ productId: P._id, quantity: 100000 }] });
ok(r.status === 422, 'absurd quantities are refused');

// --- guest self-referral -----------------------------------------------------------------
const me = await sql`select data->>'email' as email, data->>'memberCode' as code from users where data->>'email' = 'e2e-alice@test.local'`;
r = await call('POST', '/orders/quote', { items: [{ productId: P._id, quantity: 1 }], refCode: me[0].code });
ok(!!r.data.referredBy, 'a stranger with the link is attributed');
r = await call('POST', '/orders', { items: [{ productId: P._id, quantity: 1 }], shippingAddress: { ...ship, phone: '03001234567' }, paymentMethod: 'cod', refCode: me[0].code, guestInfo: guest('e2e-alice@test.local', '03001234567') });
ok(r.status === 201 && !r.data.member.sponsor, 'partner ordering as a guest with own code earns nothing', r.data?.member);
await call('PATCH', `/orders/${r.data._id}/status`, { status: 'cancelled' }, admin);

// --- coupon limits -------------------------------------------------------------------------
await sql`delete from coupons where data->>'code' in ('E2EONCE','E2ELIMIT','E2ECAT')`;
await sql`insert into coupons (_id, data, created_at, updated_at) values
  (${crypto.randomBytes(12).toString('hex')}, ${sql.json({ code: 'E2EONCE', type: 'fixed', value: 100, isActive: true, perUserLimit: 1, usageCount: 0 })}, now(), now()),
  (${crypto.randomBytes(12).toString('hex')}, ${sql.json({ code: 'E2ELIMIT', type: 'fixed', value: 50, isActive: true, usageLimit: 1, usageCount: 0 })}, now(), now()),
  (${crypto.randomBytes(12).toString('hex')}, ${sql.json({ code: 'E2ECAT', type: 'percentage', value: 50, isActive: true, applicableCategories: ['000000000000000000000000'], usageCount: 0 })}, now(), now())`;
const g1 = guest('e2e-coupon@test.local');
r = await call('POST', '/orders', { items: [{ productId: P._id, quantity: 1 }], shippingAddress: ship, paymentMethod: 'cod', couponCode: 'E2EONCE', guestInfo: g1 });
ok(r.status === 201 && r.data.discount === 100, 'guest uses a one-per-customer coupon');
const c1 = r.data;
r = await call('POST', '/orders', { items: [{ productId: P._id, quantity: 1 }], shippingAddress: ship, paymentMethod: 'cod', couponCode: 'E2EONCE', guestInfo: g1 });
ok(r.status === 400, 'same guest email cannot use it twice', r.message);
const lim = await Promise.all([1, 2, 3].map((i) => call('POST', '/orders', { items: [{ productId: P._id, quantity: 1 }], shippingAddress: ship, paymentMethod: 'cod', couponCode: 'E2ELIMIT', guestInfo: guest(`e2e-lim${i}@test.local`) })));
const limWon = lim.filter((x) => x.status === 201);
ok(limWon.length === 1, 'a single-use coupon is used once even under a race', lim.map((x) => x.status));
r = await call('POST', '/orders/quote', { items: [{ productId: P._id, quantity: 1 }], couponCode: 'E2ECAT' });
ok(r.data.discount === 0 && !!r.data.couponError, 'category coupons only discount their category');
r = await call('POST', '/coupons/validate', { code: 'E2EONCE', cartTotal: 5000 });
ok(r.status === 200 && !('usedBy' in (r.data?.coupon ?? {})) && !('usedByEmails' in (r.data?.coupon ?? {})), 'coupon check does not reveal who used it');
for (const x of [c1, ...limWon.map((w) => w.data)]) await call('PATCH', `/orders/${x._id}/status`, { status: 'cancelled' }, admin);
await sql`delete from coupons where data->>'code' in ('E2EONCE','E2ELIMIT','E2ECAT')`;

// --- password reset can't be guessed ---------------------------------------------------------
await call('POST', '/auth/forgot-password', { email: 'e2e-bob@test.local' });
let locked = false;
for (let i = 0; i < 6; i++) {
  r = await call('POST', '/auth/verify-password-reset-otp', { email: 'e2e-bob@test.local', otp: String(100000 + i) });
  if (r.status === 403 || (i >= 5 && r.status === 401)) locked = true;
}
const row = await sql`select data ? 'passwordResetToken' as has from users where data->>'email' = 'e2e-bob@test.local'`;
ok(locked && row[0].has === false, 'reset code is burned after 5 wrong tries');

// --- signup works without an email service ----------------------------------------------------
await sql`delete from users where data->>'email' = 'e2e-new@test.local'`;
r = await call('POST', '/auth/register', { firstName: 'New', lastName: 'Shopper', email: 'e2e-new@test.local', password: 'Test#12345', confirmPassword: 'Test#12345' });
ok(r.status === 201 && r.data?.tokens?.accessToken, 'new customers can sign up and are signed in', r);
r = await call('POST', '/auth/register', { firstName: 'Evil', lastName: 'Twin', email: 'e2e-new@test.local', password: 'Other#12345', confirmPassword: 'Other#12345' });
ok(r.status === 409, 'an existing email cannot be registered again');
await sql`delete from users where data->>'email' = 'e2e-new@test.local'`;

// --- admin data hygiene ----------------------------------------------------------------------
r = await call('GET', '/users?limit=50', null, admin);
const users = r.data?.users ?? r.data ?? [];
ok(Array.isArray(users) && users.length > 0 && users.every((u) => !('refreshTokens' in u) && !('password' in u) && !('passwordResetToken' in u)), 'admin user list has no secrets');
r = await call('GET', '/users?limit=5', null, bob);
ok(r.status === 403, 'customers cannot list users');

// --- points can't be restored by a stale save ------------------------------------------------
await sql`update users set data = jsonb_set(data, '{loyaltyPoints}', '500') where data->>'email' = 'e2e-bob@test.local'`;
const spend = call('POST', '/orders', { items: [{ productId: P._id, quantity: 1 }], shippingAddress: ship, paymentMethod: 'cod', pointsToRedeem: 500 }, bob);
const noise = Promise.all([1, 2, 3, 4].map(() => call('POST', `/wishlist/recently-viewed/${P._id}`, {}, bob)));
const [sp] = await Promise.all([spend, noise]);
const pts = (await call('GET', '/members/me', null, bob)).data.loyaltyPoints;
ok(sp.status === 201 && pts === 0, 'points spent stay spent even with other saves running', { status: sp.status, pts });
await call('PATCH', `/orders/${sp.data._id}/status`, { status: 'cancelled' }, admin);

console.log(`\n${pass} passed, ${fail} failed`);
await sql.end();
process.exit(fail ? 1 : 0);
