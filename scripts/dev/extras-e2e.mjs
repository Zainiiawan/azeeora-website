// End-to-end check of campaigns, incentives, training, pickup points, warehouse and reports.
// Run after members-e2e.mjs (reuses its test users). Usage as members-e2e.mjs.
import postgres from 'postgres';

const BASE = process.env.BASE || 'http://localhost:3100';
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
let pass = 0, fail = 0;
const ok = (c, l, x) => { if (c) { pass++; console.log('PASS ', l); } else { fail++; console.log('FAIL ', l, x ?? ''); } };
async function call(method, path, body, token, raw) {
  const res = await fetch(BASE + '/api' + path, { method, headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (raw) return res;
  let j = {}; try { j = await res.json(); } catch {}
  return { status: res.status, ...j };
}
const login = async (email) => (await call('POST', '/auth/login', { email, password: 'Test#12345' })).data.tokens?.accessToken;
const admin = await login('e2e-admin@test.local');
const alice = await login('e2e-alice@test.local');
const bob = await login('e2e-bob@test.local');
ok(admin && alice && bob, 'test users log in (run members-e2e first)');
const aliceId = (await call('GET', '/auth/me', null, alice)).data?._id ?? (await call('GET', '/auth/me', null, alice)).data?.user?._id;
const bobUser = await sql`select _id from users where data->>'email' = 'e2e-bob@test.local'`;
const bobId = bobUser[0]._id;

const P = (await call('GET', '/products?limit=5')).data.products[0];
const ship = { firstName: 'T', lastName: 'Tester', phone: '03001234567', street: '1 Test Road', city: 'Lahore', state: 'Punjab', postalCode: '54000', country: 'Pakistan' };
const today = new Date().toISOString().slice(0, 10);
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

// --- campaigns ---------------------------------------------------------------------
const before = await call('GET', `/products/${P.slug}`);
const savedDiscount = before.data.discount ?? null;
let r = await call('POST', '/campaigns', { name: 'E2E Glow Week', discountPct: 15, productIds: [P._id], startDate: today, endDate: nextWeek, isActive: true }, admin);
ok(r.status === 201, 'admin creates a catalogue campaign', r);
const camp = r.data;
r = await call('GET', `/products/${P.slug}`);
ok(r.data.discount?.value === 15 && r.data.discount?.campaign === camp._id, 'campaign offer applied to the product');
r = await call('GET', '/campaigns/active');
ok(r.data.some((c) => c._id === camp._id && c.products.length === 1), 'active catalogue lists the campaign with products');
r = await call('POST', '/orders/quote', { items: [{ productId: P._id, quantity: 1 }], city: 'Lahore' }, bob);
ok(r.data.items[0].price === Math.round(P.basePrice * 0.85) || r.data.items[0].price === P.basePrice * 0.85, 'checkout uses the campaign price', r.data.items[0]);
r = await call('POST', '/campaigns', { name: 'Bad', discountPct: 10, productIds: [], startDate: nextWeek, endDate: today }, admin);
ok(r.status === 400, 'end before start is refused');
r = await call('POST', '/campaigns', { name: 'Nope', discountPct: 10, productIds: [], startDate: today, endDate: nextWeek }, bob);
ok(r.status === 403, 'customers cannot create campaigns');
await call('DELETE', `/campaigns/${camp._id}`, null, admin);
r = await call('GET', `/products/${P.slug}`);
ok(!r.data.discount || r.data.discount.campaign !== camp._id, 'deleting the campaign removes its offer');
if (savedDiscount) await call('PUT', `/products/${P._id}`, { discount: savedDiscount }, admin);

// --- pickup points -------------------------------------------------------------------
r = await call('POST', '/pickup-points', { name: 'Sahiwal Store', city: 'Sahiwal', address: 'Main Bazaar, Sahiwal', phone: '03060466911', hours: '10am to 8pm' }, admin);
ok(r.status === 201, 'admin adds a pickup point');
const pp = r.data;
r = await call('GET', '/pickup-points');
ok(r.data.some((x) => x._id === pp._id), 'pickup points are public');
r = await call('POST', '/orders/quote', { items: [{ productId: P._id, quantity: 1 }], city: 'Karachi', pickupPointId: pp._id }, bob);
ok(r.data.shippingCost === 0, 'pickup has no delivery charge');
r = await call('POST', '/orders', { items: [{ productId: P._id, quantity: 1 }], shippingAddress: ship, paymentMethod: 'cod', pickupPointId: pp._id }, bob);
ok(r.status === 201 && r.data.deliveryMethod === 'pickup' && r.data.pickupPoint?.name === 'Sahiwal Store', 'pickup order stores the point', r);
const pickOrder = r.data;

// --- warehouse ------------------------------------------------------------------------
r = await call('GET', '/warehouse/queue', null, bob);
ok(r.status === 403, 'customers cannot open the warehouse');
await sql`update users set data = jsonb_set(data, '{role}', '"warehouse"') where data->>'email' = 'e2e-biz@test.local'`;
const wh = await login('e2e-biz@test.local');
r = await call('POST', `/warehouse/orders/${pickOrder._id}/pack`, {}, wh);
ok(r.status === 400, 'unconfirmed orders cannot be packed');
await call('PATCH', `/orders/${pickOrder._id}/status`, { status: 'processing', message: 'Confirmed' }, admin);
r = await call('GET', '/warehouse/queue?stage=to_pack', null, wh);
ok(r.status === 200 && r.data.orders.some((o) => o._id === pickOrder._id), 'confirmed order is in the packing queue');
r = await call('POST', `/warehouse/orders/${pickOrder._id}/dispatch`, { courierName: 'TCS', trackingNumber: 'TCS123' }, wh);
ok(r.status === 400, 'cannot dispatch before packing');
r = await call('POST', `/warehouse/orders/${pickOrder._id}/pack`, {}, wh);
ok(r.status === 200, 'warehouse packs the order');
r = await call('POST', `/warehouse/orders/${pickOrder._id}/dispatch`, { courierName: 'TCS', trackingNumber: 'TCS123' }, wh);
ok(r.status === 200 && r.data.status === 'shipped', 'warehouse dispatches with tracking');
r = await call('GET', `/orders/${pickOrder._id}`, null, bob);
ok(r.data.trackingNumber === 'TCS123' && r.data.status === 'shipped', 'customer sees tracking');
r = await call('GET', '/warehouse/stock', null, wh);
const stock0 = r.data.find((p) => p._id === P._id).stock;
r = await call('POST', `/warehouse/stock/${P._id}`, { delta: 5, reason: 'received', note: 'E2E delivery' }, wh);
ok(r.status === 200 && r.data.stockAfter === stock0 + 5, 'stock received and logged');
r = await call('POST', `/warehouse/stock/${P._id}`, { delta: -(stock0 + 100), reason: 'damaged' }, wh);
ok(r.status === 400, 'stock cannot go below zero');
await call('POST', `/warehouse/stock/${P._id}`, { delta: -5, reason: 'count_correction' }, wh);
r = await call('GET', `/warehouse/movements?product=${P._id}`, null, wh);
ok(r.data.length >= 2, 'movement log lists changes');
r = await call('GET', '/members/admin/overview', null, wh);
ok(r.status === 403, 'warehouse staff cannot see member money');
await sql`update users set data = jsonb_set(data, '{role}', '"customer"') where data->>'email' = 'e2e-biz@test.local'`;
await call('PATCH', `/orders/${pickOrder._id}/status`, { status: 'cancelled' }, admin);
await call('DELETE', `/pickup-points/${pp._id}`, null, admin);

// --- incentives ----------------------------------------------------------------------
r = await call('POST', '/incentives', { title: 'E2E Dubai Trip', metric: 'referral_sales', target: 50000, reward: 'Trip for two', startDate: '2026-01-01', endDate: nextWeek }, admin);
ok(r.status === 201, 'admin creates an incentive');
const inc = r.data;
r = await call('GET', '/incentives/mine', null, alice);
const mine = r.data?.find((i) => i._id === inc._id);
ok(r.status === 200 && mine && mine.progress >= 0, 'partner sees incentive progress', r);
r = await call('GET', '/incentives/mine', null, bob);
ok(r.status === 403, 'customers have no incentives');
r = await call('GET', `/incentives/${inc._id}/leaders`, null, admin);
ok(r.status === 200 && Array.isArray(r.data), 'admin sees the leaderboard');
await call('DELETE', `/incentives/${inc._id}`, null, admin);

// --- training ------------------------------------------------------------------------
r = await call('POST', '/trainings', { title: 'E2E Getting started', category: 'Basics', body: 'Share your link.', isActive: true }, admin);
const tr = r.data;
r = await call('GET', '/trainings/mine', null, alice);
ok(r.status === 200 && r.data.some((t) => t._id === tr._id), 'partners see training');
r = await call('GET', '/trainings/mine', null, bob);
ok(r.status === 403, 'customers do not');
await call('DELETE', `/trainings/${tr._id}`, null, admin);

// --- reports ---------------------------------------------------------------------------
let res = await call('GET', '/reports/orders.csv', null, admin, true);
let text = await res.text();
ok(res.headers.get('content-type')?.includes('text/csv') && text.includes('Order,Date,Customer'), 'orders CSV downloads');
res = await call('GET', '/reports/members.csv', null, admin, true);
text = await res.text();
ok(text.includes('e2e-alice@test.local'), 'members CSV lists partners');
await sql`update users set data = jsonb_set(data, '{firstName}', '"=HYPERLINK(1)"') where data->>'email' = 'e2e-alice@test.local'`;
res = await call('GET', '/reports/members.csv', null, admin, true);
text = await res.text();
ok(text.includes("'=HYPERLINK(1)"), 'CSV neutralises spreadsheet formulas');
await sql`update users set data = jsonb_set(data, '{firstName}', '"Alice"') where data->>'email' = 'e2e-alice@test.local'`;
res = await call('GET', '/reports/orders.csv', null, bob, true);
ok(res.status === 403, 'reports are admin only');

console.log(`\n${pass} passed, ${fail} failed`);
await sql.end();
process.exit(fail ? 1 : 0);
