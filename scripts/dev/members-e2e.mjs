// End-to-end check of the member programme against a local database.
// Usage: DATABASE_URL=... BASE=http://localhost:3100 node scripts/dev/members-e2e.mjs
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const BASE = process.env.BASE || 'http://localhost:3100';
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 2 });
let pass = 0, fail = 0;
const ok = (cond, label, extra) => { if (cond) { pass++; console.log('PASS ', label); } else { fail++; console.log('FAIL ', label, extra ?? ''); } };
const id = () => Math.floor(Date.now() / 1000).toString(16).padStart(8, '0') + crypto.randomBytes(8).toString('hex');

async function call(method, path, body, token) {
  const res = await fetch(BASE + '/api' + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch {}
  return { status: res.status, ...json };
}

// --- fresh test users ---------------------------------------------------------
await sql`delete from wallet_entries where "user" in (select _id from users where data->>'email' like 'e2e-%@test.local')`;
await sql`delete from withdrawals where "user" in (select _id from users where data->>'email' like 'e2e-%@test.local')`;
await sql`delete from orders where data->>'customerEmail' like 'e2e-%@test.local'`;
await sql`delete from users where data->>'email' like 'e2e-%@test.local'`;
const pw = await bcrypt.hash('Test#12345', 10);
const mk = async (name, role = 'customer') => {
  const _id = id();
  const now = new Date().toISOString();
  const data = { firstName: name, lastName: 'Tester', email: `e2e-${name.toLowerCase()}@test.local`, password: pw, role, isEmailVerified: true, isActive: true, addresses: [], wishlist: [], compare: [], recentlyViewed: [], refreshTokens: [], createdAt: now, updatedAt: now };
  await sql`insert into users (_id, data, created_at, updated_at) values (${_id}, ${sql.json(data)}, now(), now())`;
  const r = await call('POST', '/auth/login', { email: data.email, password: 'Test#12345' });
  return { _id, token: r.data?.accessToken || r.data?.tokens?.accessToken, email: data.email };
};
const admin = await mk('Admin', 'admin');
const alice = await mk('Alice');
const bob = await mk('Bob');
const biz = await mk('Biz');
ok(admin.token && alice.token && bob.token && biz.token, 'test users can log in');

// reset programme settings to defaults for a predictable run
await call('PUT', '/members/admin/settings', { referralCommissionPct: 10, partnerDiscountTiers: [{ minBV: 0, pct: 20 }, { minBV: 100, pct: 25 }], wholesaleDefaultDiscountPct: 30, wholesaleDefaultMinQty: 6, minWithdrawal: 1000, loyaltyRsPerPoint: 100, pointValueRs: 1, minRedeemPoints: 100, rsPerBV: 100, couponsForMembers: false }, admin.token);

const products = (await call('GET', '/products?limit=5')).data.products;
const P = products[0];
ok(products.every((p) => !('wholesalePrice' in p)), 'public product list hides wholesale prices');
const ship = { firstName: 'T', lastName: 'Tester', phone: '03001234567', street: '1 Test Road', city: 'Lahore', state: 'Punjab', postalCode: '54000', country: 'Pakistan' };

// --- partner application ---------------------------------------------------------
let r = await call('POST', '/members/partner/apply', { phone: '03001234567', cnic: '35202-1234567-1', city: 'Lahore', agreeTerms: true }, alice.token);
ok(r.status === 201 && r.data.partner.status === 'pending', 'partner application is pending', r);
r = await call('POST', '/members/partner/apply', { phone: '03001234567', cnic: '35202-1234567-1', city: 'Lahore', agreeTerms: true }, alice.token);
ok(r.status === 400, 'cannot apply twice');
r = await call('GET', '/members/me', null, alice.token);
ok(r.data.accountType === 'customer', 'pending partner still pays retail');
r = await call('POST', `/members/admin/${alice._id}/partner`, { action: 'approve' }, alice.token);
ok(r.status === 403, 'non-admin cannot approve');
r = await call('POST', `/members/admin/${alice._id}/partner`, { action: 'approve' }, admin.token);
ok(r.status === 200 && /^AZ-\d{6}$/.test(r.data.memberCode), 'admin approves partner, member code issued', r);
const code = r.data.memberCode;
r = await call('GET', `/members/ref/${code}`);
ok(r.data.valid === true, 'referral code resolves');
r = await call('GET', `/members/ref/AZ-000000`);
ok(r.data.valid === false, 'unknown referral code is rejected');

// --- referred customer order ---------------------------------------------------
r = await call('POST', '/orders/quote', { items: [{ productId: P._id, quantity: 2 }], city: 'Lahore', refCode: code }, bob.token);
const bobQuote = r.data;
ok(r.status === 200 && bobQuote.buyerType === 'customer' && bobQuote.referredBy, 'quote shows referral', r);
r = await call('POST', '/orders', { items: [{ productId: P._id, quantity: 2 }], shippingAddress: ship, paymentMethod: 'cod', refCode: code }, bob.token);
const bobOrder = r.data;
ok(r.status === 201 && bobOrder.member.commission === Math.round(bobQuote.subtotal * 0.1), 'commission is 10% of merchandise', { got: bobOrder?.member, sub: bobQuote.subtotal });
ok(bobOrder.total === bobQuote.total, 'order total matches quote');
r = await call('GET', '/members/me', null, alice.token);
ok(r.data.wallet.pending === bobOrder.member.commission && r.data.wallet.available === 0, 'commission waits as pending', r.data.wallet);
r = await call('GET', '/members/me', null, bob.token);
ok(r.data.sponsor?.memberCode === code, 'customer is now linked to the partner');
// second order needs no ref code
r = await call('POST', '/orders/quote', { items: [{ productId: P._id, quantity: 1 }], city: 'Lahore' }, bob.token);
ok(!!r.data.referredBy, 'linked customer keeps earning the partner commission');

r = await call('PATCH', `/orders/${bobOrder._id}/status`, { status: 'delivered', message: 'Delivered' }, admin.token);
ok(r.status === 200, 'admin marks delivered', r);
r = await call('GET', '/members/me', null, alice.token);
ok(r.data.wallet.available === bobOrder.member.commission && r.data.wallet.pending === 0, 'commission released on delivery', r.data.wallet);
r = await call('GET', '/members/me', null, bob.token);
ok(r.data.loyaltyPoints === bobOrder.member.pointsEarned && bobOrder.member.pointsEarned > 0, 'customer earned loyalty points', r.data.loyaltyPoints);

// --- partner buys at a discount, pays part from wallet, then cancels -------------
r = await call('POST', '/orders/quote', { items: [{ productId: P._id, quantity: 1 }], city: 'Lahore' }, alice.token);
const aq = r.data;
ok(aq.buyerType === 'partner' && aq.discountPct === 20 && aq.items[0].price === Math.round(aq.items[0].retailPrice * 0.8), 'partner gets 20% off', aq);
const useWallet = Math.min(aq.walletAvailable, aq.total);
r = await call('POST', '/orders', { items: [{ productId: P._id, quantity: 1 }], shippingAddress: ship, paymentMethod: 'cod', walletAmount: useWallet }, alice.token);
const aliceOrder = r.data;
ok(r.status === 201 && aliceOrder.walletUsed === useWallet && aliceOrder.member.commission === 0, 'partner order uses wallet, no self-commission', r);
r = await call('GET', '/members/me', null, alice.token);
ok(r.data.wallet.available === bobOrder.member.commission - useWallet, 'wallet debited');
ok(r.data.monthlyBV === aliceOrder.member.bv, 'partner monthly points credited', r.data.monthlyBV);
r = await call('POST', '/orders', { items: [{ productId: P._id, quantity: 1 }], shippingAddress: ship, paymentMethod: 'wallet' }, alice.token);
ok(r.status === 400, 'wallet-only payment refused when balance is short');
r = await call('PATCH', `/orders/${aliceOrder._id}/status`, { status: 'cancelled', message: 'Cancelled' }, admin.token);
r = await call('GET', '/members/me', null, alice.token);
ok(r.data.wallet.available === bobOrder.member.commission && r.data.monthlyBV === 0, 'cancel refunds wallet and removes points', r.data);

// --- concurrency: three orders race for the same wallet money --------------------
await call('POST', '/members/admin/wallet-adjust', { userId: bob._id, amount: 100, note: 'race test' }, admin.token);
const race = await Promise.all([1, 2, 3].map(() => call('POST', '/orders', { items: [{ productId: P._id, quantity: 1 }], shippingAddress: ship, paymentMethod: 'cod', walletAmount: 100 }, bob.token)));
const winners = race.filter((x) => x.status === 201 && x.data.walletUsed === 100).length;
r = await call('GET', '/members/me', null, bob.token);
ok(winners === 1 && r.data.wallet.available === 0, 'only one order can spend the same Rs 100', { winners, wallet: r.data.wallet, statuses: race.map((x) => x.status + ' ' + (x.message || '')) });

// --- loyalty points redeem ----------------------------------------------------------
await sql`update users set data = jsonb_set(data, '{loyaltyPoints}', '150') where _id = ${bob._id}`;
r = await call('POST', '/orders/quote', { items: [{ productId: P._id, quantity: 1 }], city: 'Lahore', pointsToRedeem: 50 }, bob.token);
ok(r.status === 400, 'redeeming below the minimum is refused');
r = await call('POST', '/orders', { items: [{ productId: P._id, quantity: 1 }], shippingAddress: ship, paymentMethod: 'cod', pointsToRedeem: 150 }, bob.token);
ok(r.status === 201 && r.data.pointsDiscount === 150, 'points redeemed at checkout', r);
const pointsOrder = r.data;
r = await call('GET', '/members/me', null, bob.token);
ok(r.data.loyaltyPoints === 0, 'points balance spent');
await call('PATCH', `/orders/${pointsOrder._id}/status`, { status: 'cancelled' }, admin.token);
r = await call('GET', '/members/me', null, bob.token);
ok(r.data.loyaltyPoints === 150, 'cancel gives points back', r.data.loyaltyPoints);

// --- wholesale account --------------------------------------------------------------
r = await call('POST', '/members/business/apply', { companyName: 'Glow Salon', businessType: 'salon', contactPhone: '03001234567', city: 'Lahore', address: '12 Mall Road, Lahore' }, biz.token);
ok(r.status === 201, 'wholesale application received', r);
r = await call('GET', '/members/wholesale-prices', null, biz.token);
ok(r.status === 403, 'pending wholesale account cannot see prices');
await call('POST', `/members/admin/${biz._id}/business`, { action: 'approve' }, admin.token);
r = await call('PUT', `/products/${P._id}`, { wholesalePrice: 500, wholesaleMinQty: 4 }, admin.token);
ok(r.status === 200, 'admin sets a wholesale price', r);
r = await call('GET', `/products/${P.slug}`, null, admin.token);
ok(r.data.wholesalePrice === 500, 'admin sees wholesale price');
r = await call('GET', `/products/${P.slug}`);
ok(!('wholesalePrice' in r.data), 'public product page hides it');
r = await call('GET', '/members/wholesale-prices', null, biz.token);
ok(r.status === 200 && r.data.find((x) => x.productId === P._id)?.price === 500, 'approved wholesale account sees price list');
r = await call('POST', '/orders/quote', { items: [{ productId: P._id, quantity: 2 }], city: 'Lahore' }, biz.token);
ok(r.data.items[0].price === r.data.items[0].retailPrice && r.data.notices.length === 1, 'below minimum quantity pays retail with a notice', r.data);
r = await call('POST', '/orders/quote', { items: [{ productId: P._id, quantity: 4 }], city: 'Lahore', refCode: code }, biz.token);
ok(r.data.items[0].price === 500 && !r.data.referredBy, 'wholesale price at minimum quantity, no referral commission', r.data);
await sql`insert into coupons (_id, data, created_at, updated_at) values (${id()}, ${sql.json({ code: 'E2ETEN', type: 'percentage', value: 10, isActive: true })}, now(), now()) on conflict do nothing`;
r = await call('POST', '/orders/quote', { items: [{ productId: P._id, quantity: 4 }], city: 'Lahore', couponCode: 'E2ETEN' }, biz.token);
ok(!!r.data.couponError && r.data.discount === 0, 'coupons do not stack with wholesale prices');
await call('PUT', `/products/${P._id}`, { wholesalePrice: null, wholesaleMinQty: null }, admin.token);

// --- withdrawals --------------------------------------------------------------------
r = await call('POST', '/members/withdrawals', { amount: 50 }, alice.token);
ok(r.status === 400 && /Verify/.test(r.message), 'withdrawal needs verified payout details');
r = await call('POST', '/members/kyc', { cnic: '35202-1234567-1', method: 'jazzcash', accountTitle: 'Alice Tester', accountNumber: '03001234567' }, alice.token);
ok(r.status === 201 && r.data.kyc.accountNumber.startsWith('••••'), 'payout details submitted and masked');
await call('POST', `/members/admin/${alice._id}/kyc`, { action: 'approve' }, admin.token);
r = await call('POST', '/members/withdrawals', { amount: 50 }, alice.token);
ok(r.status === 400 && /minimum/.test(r.message), 'minimum withdrawal enforced');
await call('PUT', '/members/admin/settings', { referralCommissionPct: 10, partnerDiscountTiers: [{ minBV: 0, pct: 20 }, { minBV: 100, pct: 25 }], wholesaleDefaultDiscountPct: 30, wholesaleDefaultMinQty: 6, minWithdrawal: 10, loyaltyRsPerPoint: 100, pointValueRs: 1, minRedeemPoints: 100, rsPerBV: 100, couponsForMembers: false }, admin.token);
const bal = (await call('GET', '/members/me', null, alice.token)).data.wallet.available;
r = await call('POST', '/members/withdrawals', { amount: bal + 1 }, alice.token);
ok(r.status === 400 && /Insufficient/.test(r.message), 'cannot withdraw more than the balance', r);
r = await call('POST', '/members/withdrawals', { amount: bal }, alice.token);
const w1 = r.data;
ok(r.status === 201, 'withdrawal requested', r);
r = await call('POST', '/members/withdrawals', { amount: 10 }, alice.token);
ok(r.status === 400, 'only one open withdrawal at a time');
r = await call('GET', '/members/me', null, alice.token);
ok(r.data.wallet.available === 0, 'requested amount is held');
await call('POST', `/members/admin/withdrawals/${w1._id}`, { action: 'reject', note: 'Wrong number' }, admin.token);
r = await call('GET', '/members/me', null, alice.token);
ok(r.data.wallet.available === bal, 'rejected withdrawal returns the money');
r = await call('POST', '/members/withdrawals', { amount: bal }, alice.token);
r = await call('POST', `/members/admin/withdrawals/${r.data._id}`, { action: 'paid' }, admin.token);
ok(r.status === 400, 'paying needs a reference');
const open = (await call('GET', '/members/admin/withdrawals?status=requested', null, admin.token)).data.find((x) => x.user === alice._id);
r = await call('POST', `/members/admin/withdrawals/${open._id}`, { action: 'paid', reference: 'JC-123' }, admin.token);
ok(r.status === 200 && r.data.status === 'paid', 'admin marks withdrawal paid');
r = await call('GET', '/members/me', null, alice.token);
ok(r.data.wallet.available === 0 && r.data.wallet.withdrawn === bal, 'wallet shows the payout', r.data.wallet);

// --- refund after delivery reverses the commission ----------------------------------
await call('PATCH', `/orders/${bobOrder._id}/status`, { status: 'refunded' }, admin.token);
r = await call('GET', '/members/me', null, alice.token);
ok(r.data.wallet.available === -bobOrder.member.commission, 'refund after delivery books a reversal', r.data.wallet);

// --- month close ----------------------------------------------------------------------
await sql`update users set data = jsonb_set(data, '{monthlyBV}', '42') where _id = ${alice._id}`;
await sql`update settings set data = data - 'lastClosedPeriod'`;
r = await call('POST', '/members/admin/close-month', {}, admin.token);
ok(r.status === 200, 'month closed', r);
r = await call('GET', '/members/me', null, alice.token);
ok(r.data.monthlyBV === 0 && r.data.lastMonthBV === 42, 'monthly points rolled over');
r = await call('POST', '/members/admin/close-month', {}, admin.token);
ok(r.status === 400, 'same month cannot close twice');

r = await call('GET', '/members/admin/overview', null, admin.token);
ok(r.status === 200 && r.data.partners >= 1 && r.data.businesses >= 1, 'admin overview counts members', r.data);

await sql`delete from coupons where data->>'code' = 'E2ETEN'`;
console.log(`\n${pass} passed, ${fail} failed`);
await sql.end();
process.exit(fail ? 1 : 0);
