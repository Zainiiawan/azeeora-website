import { z } from 'zod';
import slugify from 'slugify';
import { db, getSql, Doc } from '../db';
import { Router, json, validate, authenticate, adminOnly, staffOnly, BadRequestError, NotFoundError, ForbiddenError } from '../http';
import { isPartner } from '../members';
import { applyOrderStatus } from './orders';

const imageUrl = z.string().refine((v) => /^https?:\/\//.test(v) || /^\/[^/]/.test(v), 'Invalid image URL');
const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');
const now = () => new Date().toISOString();

const activeNow = (d: Doc) => {
  const t = Date.now();
  return d.isActive !== false && (!d.startDate || Date.parse(d.startDate) <= t) && (!d.endDate || Date.parse(d.endDate) + 86400000 > t);
};

// ===========================================================================
// Catalogue campaigns: a named offer period with a % off on chosen products.
// The offer is written onto each product's own discount (with the campaign's
// dates), so every price in the shop, cart and checkout follows it.
// ===========================================================================
export const campaigns = new Router();

const campaignSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(600).optional(),
  image: imageUrl.optional().or(z.literal('')),
  discountPct: z.number().min(0).max(90),
  productIds: z.array(z.string()).max(500),
  startDate: isoDate,
  endDate: isoDate,
  isActive: z.boolean().default(true),
});

async function syncCampaignDiscounts(campaign: Doc | null, previousIds: string[] = [], campaignId?: string) {
  const id = campaign?._id ?? campaignId;
  const wanted = new Set(campaign && campaign.isActive !== false ? campaign.productIds ?? [] : []);
  const touched = Array.from(new Set([...previousIds, ...wanted]));
  for (const pid of touched) {
    const p = await db.products.findById(pid);
    if (!p) continue;
    if (wanted.has(pid) && campaign) {
      p.discount = campaign.discountPct > 0 ? { type: 'percentage', value: campaign.discountPct, startDate: campaign.startDate, endDate: campaign.endDate, campaign: id } : null;
      p.campaign = id;
    } else if (p.discount?.campaign === id || p.campaign === id) {
      if (p.discount?.campaign === id) p.discount = null;
      delete p.campaign;
    } else continue;
    await db.products.save(p);
  }
}

campaigns.get('/active', async () => {
  const list = (await db.campaigns.find({}, { sort: { startDate: -1 } })).filter(activeNow);
  const out = [];
  for (const c of list) {
    const products = (await db.products.findByIds(c.productIds ?? [])).filter((p) => p.isActive);
    for (const p of products) delete p.wholesalePrice;
    out.push({ ...c, products });
  }
  return json({ success: true, message: 'Active campaigns', data: out });
});

campaigns.get('/', adminOnly, async () => json({ success: true, message: 'Campaigns', data: await db.campaigns.find({}, { sort: { startDate: -1 } }) }));

campaigns.post('/', adminOnly, validate(campaignSchema), async ({ body }) => {
  if (Date.parse(body.endDate) < Date.parse(body.startDate)) throw new BadRequestError('End date is before the start date');
  const slug = slugify(body.name, { lower: true, strict: true }) + '-' + Date.now().toString(36).slice(-4);
  const c = await db.campaigns.create({ ...body, slug });
  await syncCampaignDiscounts(c);
  return json({ success: true, message: 'Campaign created', data: c }, 201);
});

campaigns.put('/:id', adminOnly, validate(campaignSchema), async ({ params, body }) => {
  const c = await db.campaigns.findById(params.id);
  if (!c) throw new NotFoundError('Campaign');
  if (Date.parse(body.endDate) < Date.parse(body.startDate)) throw new BadRequestError('End date is before the start date');
  const previous = c.productIds ?? [];
  Object.assign(c, body);
  await db.campaigns.save(c);
  await syncCampaignDiscounts(c, previous);
  return json({ success: true, message: 'Campaign saved', data: c });
});

campaigns.delete('/:id', adminOnly, async ({ params }) => {
  const c = await db.campaigns.findById(params.id);
  if (!c) throw new NotFoundError('Campaign');
  await syncCampaignDiscounts(null, c.productIds ?? [], c._id);
  await db.campaigns.deleteById(c._id);
  return json({ success: true, message: 'Campaign deleted' });
});

// ===========================================================================
// Incentives & recognition: targets for Brand Partners with live progress
// ===========================================================================
export const incentives = new Router();

const METRICS = ['referral_sales', 'personal_sales', 'new_referrals', 'commission'] as const;
const incentiveSchema = z.object({
  title: z.string().min(2).max(100),
  description: z.string().max(800).optional(),
  image: imageUrl.optional().or(z.literal('')),
  metric: z.enum(METRICS),
  target: z.number().positive(),
  reward: z.string().min(2).max(160),
  startDate: isoDate,
  endDate: isoDate,
  isActive: z.boolean().default(true),
});

async function incentiveProgress(userId: string, inc: Doc): Promise<number> {
  const sql = getSql();
  const from = new Date(inc.startDate).toISOString();
  const to = new Date(Date.parse(inc.endDate) + 86400000).toISOString();
  const closed = ['cancelled', 'refunded', 'returned'];
  if (inc.metric === 'referral_sales') {
    const r = await sql`select coalesce(sum((data->>'subtotal')::numeric - coalesce((data->>'discount')::numeric,0)),0) as v from orders
      where data#>>'{member,sponsor}' = ${userId} and created_at >= ${from} and created_at < ${to} and not (data->>'status' = any(${closed}))`;
    return Number(r[0].v);
  }
  if (inc.metric === 'personal_sales') {
    const r = await sql`select coalesce(sum((data->>'subtotal')::numeric),0) as v from orders
      where data->>'user' = ${userId} and created_at >= ${from} and created_at < ${to} and not (data->>'status' = any(${closed}))`;
    return Number(r[0].v);
  }
  if (inc.metric === 'new_referrals') {
    const r = await sql`select count(*)::int as v from users where referred_by = ${userId} and coalesce(data->>'referredAt', created_at::text) >= ${from} and coalesce(data->>'referredAt', created_at::text) < ${to}`;
    return Number(r[0].v);
  }
  const r = await sql`select coalesce(sum((data->>'amount')::numeric),0) as v from wallet_entries
    where "user" = ${userId} and type = 'commission' and status <> 'cancelled' and created_at >= ${from} and created_at < ${to}`;
  return Number(r[0].v);
}

incentives.get('/mine', authenticate, async ({ user }) => {
  const me = await db.users.findById(user!._id);
  if (!isPartner(me)) throw new ForbiddenError('Incentives are for Brand Partners');
  const list = (await db.incentives.find({}, { sort: { endDate: 1 } })).filter((i) => i.isActive !== false && Date.parse(i.endDate) + 86400000 > Date.now());
  const data = [];
  for (const i of list) data.push({ ...i, progress: await incentiveProgress(me!._id, i), started: Date.parse(i.startDate) <= Date.now() });
  return json({ success: true, message: 'Incentives', data });
});

incentives.get('/', adminOnly, async () => json({ success: true, message: 'Incentives', data: await db.incentives.find({}, { sort: { startDate: -1 } }) }));

incentives.get('/:id/leaders', adminOnly, async ({ params }) => {
  const inc = await db.incentives.findById(params.id);
  if (!inc) throw new NotFoundError('Incentive');
  const partners = await db.users.find({ 'partner.status': 'approved' }, { limit: 1000 });
  const rows = [];
  for (const p of partners) {
    const progress = await incentiveProgress(p._id, inc);
    if (progress > 0) rows.push({ _id: p._id, name: `${p.firstName} ${p.lastName}`, memberCode: p.memberCode, progress, qualified: progress >= inc.target });
  }
  rows.sort((a, b) => b.progress - a.progress);
  return json({ success: true, message: 'Leaders', data: rows.slice(0, 100) });
});

incentives.post('/', adminOnly, validate(incentiveSchema), async ({ body }) => json({ success: true, message: 'Incentive created', data: await db.incentives.create(body) }, 201));
incentives.put('/:id', adminOnly, validate(incentiveSchema), async ({ params, body }) => {
  const d = await db.incentives.updateById(params.id, body);
  if (!d) throw new NotFoundError('Incentive');
  return json({ success: true, message: 'Incentive saved', data: d });
});
incentives.delete('/:id', adminOnly, async ({ params }) => {
  await db.incentives.deleteById(params.id);
  return json({ success: true, message: 'Incentive deleted' });
});

// ===========================================================================
// Training for Brand Partners
// ===========================================================================
export const trainings = new Router();

const trainingSchema = z.object({
  title: z.string().min(2).max(120),
  category: z.string().max(60).optional(),
  summary: z.string().max(300).optional(),
  body: z.string().max(20000).optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
  order: z.number().int().optional(),
  isActive: z.boolean().default(true),
});

trainings.get('/mine', authenticate, async ({ user }) => {
  const me = await db.users.findById(user!._id);
  if (!isPartner(me) && me?.role !== 'admin') throw new ForbiddenError('Training is for Brand Partners');
  const list = (await db.trainings.find({ isActive: true }, { sort: { order: 1, createdAt: 1 } })).filter((t) => t.isActive !== false);
  return json({ success: true, message: 'Training', data: list });
});
trainings.get('/', adminOnly, async () => json({ success: true, message: 'Training', data: await db.trainings.find({}, { sort: { order: 1, createdAt: 1 } }) }));
trainings.post('/', adminOnly, validate(trainingSchema), async ({ body }) => json({ success: true, message: 'Training created', data: await db.trainings.create(body) }, 201));
trainings.put('/:id', adminOnly, validate(trainingSchema), async ({ params, body }) => {
  const d = await db.trainings.updateById(params.id, body);
  if (!d) throw new NotFoundError('Training');
  return json({ success: true, message: 'Training saved', data: d });
});
trainings.delete('/:id', adminOnly, async ({ params }) => {
  await db.trainings.deleteById(params.id);
  return json({ success: true, message: 'Training deleted' });
});

// ===========================================================================
// Pickup points (collect in person, no delivery charge)
// ===========================================================================
export const pickupPoints = new Router();

const pickupSchema = z.object({
  name: z.string().min(2).max(80),
  city: z.string().min(2).max(60),
  address: z.string().min(5).max(250),
  phone: z.string().max(20).optional(),
  hours: z.string().max(120).optional(),
  isActive: z.boolean().default(true),
});

pickupPoints.get('/', async () => {
  const list = await db.pickupPoints.find({ isActive: true }, { sort: { city: 1, name: 1 } });
  return json({ success: true, message: 'Pickup points', data: list });
});
pickupPoints.get('/all', adminOnly, async () => json({ success: true, message: 'Pickup points', data: await db.pickupPoints.find({}, { sort: { city: 1 } }) }));
pickupPoints.post('/', adminOnly, validate(pickupSchema), async ({ body }) => json({ success: true, message: 'Pickup point created', data: await db.pickupPoints.create(body) }, 201));
pickupPoints.put('/:id', adminOnly, validate(pickupSchema), async ({ params, body }) => {
  const d = await db.pickupPoints.updateById(params.id, body);
  if (!d) throw new NotFoundError('Pickup point');
  return json({ success: true, message: 'Pickup point saved', data: d });
});
pickupPoints.delete('/:id', adminOnly, async ({ params }) => {
  await db.pickupPoints.updateById(params.id, { isActive: false });
  return json({ success: true, message: 'Pickup point disabled' });
});

// ===========================================================================
// Warehouse: pack and dispatch, stock adjustments with a movement log
// ===========================================================================
export const warehouse = new Router();

const READY = ['confirmed', 'processing'];

warehouse.get('/queue', staffOnly, async ({ query }) => {
  const stage = String(query.stage ?? 'to_pack');
  let list: Doc[];
  if (stage === 'shipped') {
    list = await db.orders.find({ status: { $in: ['shipped', 'out_for_delivery'] } }, { sort: { updatedAt: -1 }, limit: 100 });
  } else {
    list = await db.orders.find({ status: { $in: READY } }, { sort: { createdAt: 1 }, limit: 300 });
    list = list.filter((o) => (stage === 'packed' ? !!o.fulfilment?.packedAt : !o.fulfilment?.packedAt));
  }
  const counts = {
    toPack: (await db.orders.find({ status: { $in: READY } }, { limit: 1000 })).filter((o) => !o.fulfilment?.packedAt).length,
  };
  return json({
    success: true,
    message: 'Queue',
    data: {
      counts,
      orders: list.map((o) => ({
        _id: o._id,
        orderNumber: o.orderNumber,
        createdAt: o.createdAt,
        status: o.status,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        shippingAddress: o.shippingAddress,
        pickupPoint: o.pickupPoint,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
        amountDue: o.amountDue ?? o.total,
        items: (o.items ?? []).map((i: Doc) => ({ name: i.name, sku: i.sku, quantity: i.quantity, image: i.image })),
        fulfilment: o.fulfilment,
        courierName: o.courierName,
        trackingNumber: o.trackingNumber,
        notes: o.notes,
      })),
    },
  });
});

warehouse.post('/orders/:id/pack', staffOnly, async ({ params, user }) => {
  const o = await db.orders.findById(params.id);
  if (!o) throw new NotFoundError('Order');
  if (!READY.includes(o.status)) throw new BadRequestError('Only confirmed orders can be packed');
  o.fulfilment = { ...(o.fulfilment ?? {}), packedAt: now(), packedBy: `${user!.firstName} ${user!.lastName}` };
  await db.orders.save(o);
  return json({ success: true, message: 'Packed', data: o.fulfilment });
});

const dispatchSchema = z.object({
  courierName: z.string().min(2).max(60),
  trackingNumber: z.string().min(2).max(60),
  trackingUrl: z.string().url().optional().or(z.literal('')),
});

warehouse.post('/orders/:id/dispatch', staffOnly, validate(dispatchSchema), async ({ params, body, user }) => {
  const o = await db.orders.findById(params.id);
  if (!o) throw new NotFoundError('Order');
  if (!READY.includes(o.status)) throw new BadRequestError('Only confirmed orders can be dispatched');
  if (!o.fulfilment?.packedAt) throw new BadRequestError('Pack the order first');
  const updated = await applyOrderStatus(
    o._id,
    {
      status: 'shipped',
      message: `Dispatched with ${body.courierName}, tracking ${body.trackingNumber}`,
      courierName: body.courierName,
      trackingNumber: body.trackingNumber,
      trackingUrl: body.trackingUrl || undefined,
    } as any,
    { fulfilment: { ...(o.fulfilment ?? {}), dispatchedAt: now(), dispatchedBy: `${user!.firstName} ${user!.lastName}` } }
  );
  return json({ success: true, message: 'Dispatched', data: { status: updated.status } });
});

warehouse.get('/stock', staffOnly, async () => {
  const list = await db.products.find({}, { sort: { name: 1 } });
  return json({
    success: true,
    message: 'Stock',
    data: list.map((p) => ({ _id: p._id, name: p.name, sku: p.sku, image: p.images?.[0]?.url, stock: p.stock ?? 0, lowStockThreshold: p.lowStockThreshold ?? 10, soldCount: p.soldCount ?? 0, isActive: p.isActive })),
  });
});

const stockSchema = z.object({
  delta: z.number().int().refine((n) => n !== 0, 'Enter a quantity'),
  reason: z.enum(['received', 'damaged', 'returned', 'count_correction', 'other']),
  note: z.string().max(200).optional(),
});

warehouse.post('/stock/:productId', staffOnly, validate(stockSchema), async ({ params, body, user }) => {
  const sql = getSql();
  const ts = now();
  const rows = await sql`
    update products set data = jsonb_set(data, '{stock}', to_jsonb(coalesce((data->>'stock')::int, 0) + ${body.delta}::int)), updated_at = ${ts}
    where _id = ${params.productId} and coalesce((data->>'stock')::int, 0) + ${body.delta}::int >= 0
    returning (data->>'stock')::int as stock, data->>'name' as name`;
  if (!rows.length) throw new BadRequestError('Stock cannot go below zero');
  const movement = await db.stockMovements.create({
    product: params.productId,
    productName: rows[0].name,
    delta: body.delta,
    reason: body.reason,
    note: body.note,
    stockAfter: rows[0].stock,
    by: `${user!.firstName} ${user!.lastName}`,
  });
  return json({ success: true, message: 'Stock updated', data: movement });
});

warehouse.get('/movements', staffOnly, async ({ query }) => {
  const filter = query.product ? { product: String(query.product) } : {};
  return json({ success: true, message: 'Movements', data: await db.stockMovements.find(filter, { sort: { createdAt: -1 }, limit: 200 }) });
});

// ===========================================================================
// CSV reports
// ===========================================================================
export const reports = new Router();

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  // keep spreadsheet formulas from running
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
const toCsv = (header: string[], rows: unknown[][]) => [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');

function csvResponse(name: string, body: string) {
  return new Response('﻿' + body, {
    headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${name}-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}

reports.get('/orders.csv', adminOnly, async ({ query }) => {
  const parse = (v: unknown) => (v && !Number.isNaN(Date.parse(String(v))) ? Date.parse(String(v)) : null);
  const f = parse(query.from);
  const t = parse(query.to);
  const from = f !== null ? new Date(f).toISOString() : '1970-01-01';
  const to = t !== null ? new Date(t + 86400000).toISOString() : '9999-12-31';
  const sql = getSql();
  const rows = await sql`select _id, data, created_at from orders where created_at >= ${from} and created_at < ${to} order by created_at desc limit 20000`;
  return csvResponse(
    'orders',
    toCsv(
      ['Order', 'Date', 'Customer', 'Phone', 'City', 'Type', 'Status', 'Payment', 'Payment status', 'Items', 'Subtotal', 'Discounts', 'Shipping', 'Total', 'Wallet used', 'Referral code', 'Commission'],
      rows.map((r: any) => {
        const o = r.data;
        return [
          o.orderNumber,
          new Date(r.created_at).toISOString().slice(0, 16).replace('T', ' '),
          o.customerName,
          o.customerPhone,
          o.shippingAddress?.city,
          o.orderType ?? 'b2c',
          o.status,
          o.paymentMethod,
          o.paymentStatus,
          (o.items ?? []).map((i: any) => `${i.name} x${i.quantity}`).join('; '),
          o.subtotal,
          (o.discount ?? 0) + (o.manualDiscount ?? 0) + (o.pointsDiscount ?? 0),
          o.shippingCost,
          o.total,
          o.walletUsed ?? 0,
          o.member?.sponsorCode ?? '',
          o.member?.commission ?? 0,
        ];
      })
    )
  );
});

reports.get('/commissions.csv', adminOnly, async () => {
  const sql = getSql();
  const rows = await sql`select w.data, w.created_at, u.data->>'firstName' as fn, u.data->>'lastName' as ln, u.data->>'memberCode' as code
    from wallet_entries w left join users u on u._id = w."user" where w.type in ('commission','commission_reversal') order by w.created_at desc limit 20000`;
  return csvResponse(
    'commissions',
    toCsv(['Date', 'Partner', 'Member code', 'Order', 'Amount', 'Status', 'Note'], rows.map((r: any) => [new Date(r.created_at).toISOString().slice(0, 10), `${r.fn ?? ''} ${r.ln ?? ''}`.trim(), r.code, r.data.orderNumber, r.data.amount, r.data.status, r.data.note]))
  );
});

reports.get('/members.csv', adminOnly, async () => {
  const sql = getSql();
  const rows = await sql`select u._id, u.data, u.created_at,
      coalesce((select sum((w.data->>'amount')::numeric) from wallet_entries w where w."user" = u._id and w.status = 'available'),0) as wallet
    from users u where u.data ? 'partner' or u.data ? 'business' order by u.created_at desc`;
  return csvResponse(
    'members',
    toCsv(
      ['Name', 'Email', 'Phone', 'Member code', 'Partner status', 'Wholesale status', 'Business', 'City', 'Monthly BV', 'Last month BV', 'Wallet', 'Joined'],
      rows.map((r: any) => {
        const u = r.data;
        return [`${u.firstName} ${u.lastName}`, u.email, u.phone ?? u.partner?.phone ?? u.business?.contactPhone, u.memberCode, u.partner?.status ?? '', u.business?.status ?? '', u.business?.companyName ?? '', u.partner?.city ?? u.business?.city ?? '', u.monthlyBV ?? 0, u.lastMonthBV ?? 0, Number(r.wallet), new Date(r.created_at).toISOString().slice(0, 10)];
      })
    )
  );
});

reports.get('/withdrawals.csv', adminOnly, async () => {
  const list = await db.withdrawals.find({}, { sort: { createdAt: -1 }, limit: 20000 });
  return csvResponse(
    'withdrawals',
    toCsv(['Requested', 'Name', 'Member code', 'Amount', 'Method', 'Account title', 'Account', 'Bank', 'Status', 'Reference', 'Paid on'], list.map((w) => [String(w.createdAt).slice(0, 10), w.name, w.memberCode, w.amount, w.method, w.accountTitle, w.accountNumber, w.bankName, w.status, w.reference, w.processedAt ? String(w.processedAt).slice(0, 10) : '']))
  );
});
