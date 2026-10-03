import crypto from 'crypto';
import { db, getSql, newId, Doc } from './db';
import { BadRequestError } from './http';
import { getSettings, createNotification } from './commerce';
import { logger } from './logger';

/**
 * Member programme: Brand Partners (single-level referral commission and a
 * partner discount on their own orders), wholesale (B2B) accounts, the wallet
 * ledger, loyalty points and monthly points (BV).
 *
 * Money rules:
 * - The wallet is a ledger (`wallet_entries`). Balance is the sum of rows with
 *   status 'available'. Every debit takes a per-user advisory lock inside a
 *   transaction, so two requests can never spend the same balance.
 * - A commission is created 'pending' when an order is placed, becomes
 *   'available' when the order is delivered and 'cancelled' if the order is
 *   cancelled/refunded before that. A refund after delivery books a reversal.
 */

export type MemberSettings = {
  referralCommissionPct: number;
  partnerDiscountTiers: { minBV: number; pct: number }[];
  wholesaleDefaultDiscountPct: number;
  wholesaleDefaultMinQty: number;
  minWithdrawal: number;
  loyaltyRsPerPoint: number;
  pointValueRs: number;
  minRedeemPoints: number;
  rsPerBV: number;
  couponsForMembers: boolean;
};

export const MEMBER_DEFAULTS: MemberSettings = {
  referralCommissionPct: 10,
  partnerDiscountTiers: [
    { minBV: 0, pct: 20 },
    { minBV: 100, pct: 25 },
    { minBV: 250, pct: 30 },
  ],
  wholesaleDefaultDiscountPct: 30,
  wholesaleDefaultMinQty: 6,
  minWithdrawal: 1000,
  loyaltyRsPerPoint: 100,
  pointValueRs: 1,
  minRedeemPoints: 100,
  rsPerBV: 100,
  couponsForMembers: false,
};

export async function getMemberSettings(): Promise<MemberSettings> {
  const s = await getSettings();
  const m = { ...MEMBER_DEFAULTS, ...(s.members ?? {}) };
  m.partnerDiscountTiers = [...(m.partnerDiscountTiers ?? MEMBER_DEFAULTS.partnerDiscountTiers)].sort((a, b) => a.minBV - b.minBV);
  return m;
}

export const round = (n: number) => Math.round(n);

// ---------------------------------------------------------------------------
// Account type
// ---------------------------------------------------------------------------
export const isPartner = (u?: Doc | null) => u?.partner?.status === 'approved';
export const isBusiness = (u?: Doc | null) => u?.business?.status === 'approved';

export function accountType(u?: Doc | null): 'business' | 'partner' | 'customer' {
  if (isBusiness(u)) return 'business';
  if (isPartner(u)) return 'partner';
  return 'customer';
}

export function partnerDiscountPct(settings: MemberSettings, monthlyBV = 0): number {
  let pct = 0;
  for (const t of settings.partnerDiscountTiers) if (monthlyBV >= t.minBV) pct = t.pct;
  return pct;
}

export function nextTier(settings: MemberSettings, monthlyBV = 0) {
  return settings.partnerDiscountTiers.find((t) => t.minBV > monthlyBV) ?? null;
}

/** Points (BV) for one unit: the product's own value, else price / rsPerBV. */
export function unitBV(product: Doc, salePrice: number, settings: MemberSettings): number {
  if (typeof product.bv === 'number' && product.bv >= 0) return product.bv;
  return Math.max(0, Math.round(salePrice / Math.max(1, settings.rsPerBV)));
}

export function wholesaleTerms(product: Doc, retailPrice: number, settings: MemberSettings) {
  const price =
    typeof product.wholesalePrice === 'number' && product.wholesalePrice > 0
      ? product.wholesalePrice
      : round(retailPrice * (1 - settings.wholesaleDefaultDiscountPct / 100));
  const minQty = product.wholesaleMinQty && product.wholesaleMinQty > 0 ? product.wholesaleMinQty : settings.wholesaleDefaultMinQty;
  return { price, minQty };
}

// ---------------------------------------------------------------------------
// Member codes
// ---------------------------------------------------------------------------
export async function uniqueMemberCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = 'AZ-' + (100000 + crypto.randomInt(900000));
    if (!(await db.users.findOne({ memberCode: code }))) return code;
  }
  throw new Error('Could not generate a member code');
}

/** An approved, active partner with this code (case-insensitive), or null. */
export async function findSponsor(code?: string | null): Promise<Doc | null> {
  if (!code) return null;
  const clean = String(code).trim().toUpperCase();
  if (!/^AZ-\d{6}$/.test(clean)) return null;
  const u = await db.users.findOne({ memberCode: clean });
  if (!u || !isPartner(u) || u.isActive === false) return null;
  return u;
}

// ---------------------------------------------------------------------------
// Wallet ledger
// ---------------------------------------------------------------------------
type EntryInput = {
  user: string;
  type: 'commission' | 'withdrawal' | 'withdrawal_reversal' | 'order_payment' | 'order_refund' | 'adjustment' | 'commission_reversal';
  amount: number; // signed: + credit, - debit
  status: 'pending' | 'available' | 'cancelled';
  order?: string;
  orderNumber?: string;
  fromUser?: string;
  note?: string;
  withdrawal?: string;
};

export async function walletSummary(userId: string) {
  const sql = getSql();
  const rows = await sql`
    select
      coalesce(sum(case when status = 'available' then (data->>'amount')::numeric end), 0) as available,
      coalesce(sum(case when status = 'pending' then (data->>'amount')::numeric end), 0) as pending,
      coalesce(sum(case when status = 'available' and type = 'commission' then (data->>'amount')::numeric end), 0) as earned,
      coalesce(-sum(case when status = 'available' and type in ('withdrawal', 'withdrawal_reversal') then (data->>'amount')::numeric end), 0) as withdrawn
    from wallet_entries where "user" = ${userId}`;
  const r = rows[0] as any;
  return {
    available: Number(r.available),
    pending: Number(r.pending),
    earned: Number(r.earned),
    withdrawn: Number(r.withdrawn),
  };
}

/** Insert ledger rows in one transaction. Debits (negative available amounts) must be covered by the balance. */
export async function postEntries(entries: EntryInput[]): Promise<Doc[]> {
  const sql = getSql();
  const users = Array.from(new Set(entries.map((e) => e.user))).sort();
  return sql.begin(async (tx: any) => {
    for (const u of users) await tx`select pg_advisory_xact_lock(hashtext(${'wallet:' + u}))`;
    for (const u of users) {
      const debit = entries
        .filter((e) => e.user === u && e.status === 'available' && e.amount < 0)
        .reduce((s, e) => s + e.amount, 0);
      if (debit < 0) {
        const rows = await tx`select coalesce(sum((data->>'amount')::numeric), 0) as bal from wallet_entries where "user" = ${u} and status = 'available'`;
        const bal = Number(rows[0].bal);
        if (bal + debit < -0.0001) throw new BadRequestError('Insufficient wallet balance');
      }
    }
    const out: Doc[] = [];
    const now = new Date().toISOString();
    for (const e of entries) {
      const id = newId();
      const data = JSON.parse(JSON.stringify({ ...e, amount: round(e.amount * 100) / 100, createdAt: now, updatedAt: now }));
      await tx`insert into wallet_entries (_id, data, created_at, updated_at) values (${id}, ${tx.json(data)}, ${now}, ${now})`;
      out.push({ _id: id, ...data });
    }
    return out;
  });
}

async function setEntryStatus(entryId: string, status: EntryInput['status'], extra: Record<string, unknown> = {}) {
  const sql = getSql();
  const now = new Date().toISOString();
  const patch = JSON.stringify({ status, ...extra, updatedAt: now });
  await sql`update wallet_entries set data = data || ${patch}::text::jsonb, updated_at = ${now} where _id = ${entryId}`;
}

// ---------------------------------------------------------------------------
// Loyalty points and monthly BV (atomic counters on the user document)
// ---------------------------------------------------------------------------
/** Add (or with a negative delta, spend) a numeric counter on a user. Spending fails if it would go below zero. */
export async function bumpUserCounter(userId: string, field: 'loyaltyPoints' | 'monthlyBV' | 'totalBV' | 'referredBV', delta: number) {
  if (!delta) return true;
  const sql = getSql();
  const now = new Date().toISOString();
  const rows = await sql`
    update users
       set data = jsonb_set(data, ${[field]}::text[], to_jsonb(coalesce((data->>${field})::numeric, 0) + ${delta}::numeric)),
           updated_at = ${now}
     where _id = ${userId}
       and (${delta}::numeric >= 0 or coalesce((data->>${field})::numeric, 0) + ${delta}::numeric >= 0)
     returning _id`;
  return rows.length > 0;
}

// ---------------------------------------------------------------------------
// Order lifecycle hooks
// ---------------------------------------------------------------------------

/**
 * Called right after an order is created. Books the pending commission and
 * credits points (BV) to the buyer (if a partner) and the sponsor's team BV.
 */
export async function onOrderPlaced(order: Doc) {
  try {
    const m = order.member ?? {};
    if (order.user && m.bv && m.buyerType === 'partner') {
      await bumpUserCounter(order.user, 'monthlyBV', m.bv);
      await bumpUserCounter(order.user, 'totalBV', m.bv);
    }
    if (m.sponsor && m.commission > 0) {
      await postEntries([
        {
          user: m.sponsor,
          type: 'commission',
          amount: m.commission,
          status: 'pending',
          order: order._id,
          orderNumber: order.orderNumber,
          fromUser: order.user ?? undefined,
          note: `${m.commissionPct}% referral commission on order ${order.orderNumber}`,
        },
      ]);
      if (m.bv) await bumpUserCounter(m.sponsor, 'referredBV', m.bv);
      await createNotification({
        userId: m.sponsor,
        type: 'general',
        title: 'New referral order',
        message: `Order ${order.orderNumber} earns you Rs. ${m.commission.toLocaleString()} once it is delivered.`,
        link: '/account/partner',
      });
    }
  } catch (err) {
    logger.error('onOrderPlaced failed', err);
  }
}

const CLOSED = ['cancelled', 'refunded', 'returned'];

/** Called whenever an order's status changes (admin status update, customer cancel, delete). */
export async function onOrderStatusChange(order: Doc, previousStatus: string) {
  const status = order.status;
  if (status === previousStatus) return;
  const m = order.member ?? {};
  const sql = getSql();

  try {
    const commissionRows = await sql`select _id, data from wallet_entries where "order" = ${order._id} and type = 'commission' limit 1`;
    const commission = commissionRows[0] as any;

    if (status === 'delivered' && !CLOSED.includes(previousStatus)) {
      // Commission becomes spendable; loyalty points are earned
      if (commission && commission.data.status === 'pending') {
        await setEntryStatus(commission._id, 'available', { releasedAt: new Date().toISOString() });
        await createNotification({
          userId: commission.data.user,
          type: 'general',
          title: 'Commission added to your wallet',
          message: `Rs. ${Number(commission.data.amount).toLocaleString()} from order ${order.orderNumber} is now available.`,
          link: '/account/partner?tab=wallet',
        });
      }
      if (order.user && m.pointsEarned > 0 && !m.pointsCredited) {
        await bumpUserCounter(order.user, 'loyaltyPoints', m.pointsEarned);
        await db.orders.updateById(order._id, { member: { ...m, pointsCredited: true } });
        order.member = { ...m, pointsCredited: true };
      }
    }

    if (CLOSED.includes(status) && !CLOSED.includes(previousStatus)) {
      const entries: EntryInput[] = [];
      if (commission) {
        if (commission.data.status === 'pending') {
          await setEntryStatus(commission._id, 'cancelled', { cancelledAt: new Date().toISOString() });
        } else if (commission.data.status === 'available') {
          entries.push({
            user: commission.data.user,
            type: 'commission_reversal',
            amount: -Number(commission.data.amount),
            status: 'available',
            order: order._id,
            orderNumber: order.orderNumber,
            note: `Order ${order.orderNumber} was ${status}`,
          });
        }
      }
      // Give back wallet money and redeemed points to the buyer
      if (order.user && m.walletUsed > 0) {
        entries.push({
          user: order.user,
          type: 'order_refund',
          amount: m.walletUsed,
          status: 'available',
          order: order._id,
          orderNumber: order.orderNumber,
          note: `Refund for ${status} order ${order.orderNumber}`,
        });
      }
      // Reversals may take a partner's balance below zero, so they bypass the balance check
      if (entries.length) await postCredits(entries);
      if (order.user && m.pointsRedeemed > 0) await bumpUserCounter(order.user, 'loyaltyPoints', m.pointsRedeemed);
      if (order.user && m.pointsCredited && m.pointsEarned > 0) {
        await bumpUserCounter(order.user, 'loyaltyPoints', -m.pointsEarned);
      }
      if (order.user && m.bv && m.buyerType === 'partner' && !m.bvReversed) {
        await bumpUserCounter(order.user, 'monthlyBV', -m.bv);
        await bumpUserCounter(order.user, 'totalBV', -m.bv);
      }
      if (m.sponsor && m.bv) await bumpUserCounter(m.sponsor, 'referredBV', -m.bv);
      await db.orders.updateById(order._id, { member: { ...m, bvReversed: true } });
    }
  } catch (err) {
    logger.error('onOrderStatusChange failed', err);
  }
}

/** Ledger rows that must be written even if they take a balance negative (reversals, refunds). */
async function postCredits(entries: EntryInput[]) {
  const sql = getSql();
  const now = new Date().toISOString();
  await sql.begin(async (tx: any) => {
    for (const e of entries) {
      const data = JSON.parse(JSON.stringify({ ...e, createdAt: now, updatedAt: now }));
      await tx`insert into wallet_entries (_id, data, created_at, updated_at) values (${newId()}, ${tx.json(data)}, ${now}, ${now})`;
    }
  });
}

/** Admin edited an order's lines: keep a still-pending commission in step with the new total. */
export async function recalcPendingCommission(order: Doc) {
  const m = order.member ?? {};
  if (!m.sponsor || !m.commissionPct) return;
  const merchandise = Math.max(0, (order.subtotal ?? 0) - (order.discount ?? 0) - (order.manualDiscount ?? 0));
  const amount = round((merchandise * m.commissionPct) / 100);
  const sql = getSql();
  const now = new Date().toISOString();
  await sql`update wallet_entries set data = data || ${JSON.stringify({ amount, updatedAt: now })}::text::jsonb, updated_at = ${now}
            where "order" = ${order._id} and type = 'commission' and status = 'pending'`;
  await db.orders.updateById(order._id, { member: { ...m, commission: amount } });
}

export { postCredits };
