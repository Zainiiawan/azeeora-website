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
  /** @deprecated kept for old reports/UI; always equal to levelCommissionPct[0] */
  referralCommissionPct: number;
  /** Commission % per sponsor level: index 0 = direct sponsor (level 1), index 1 = level 2, etc. */
  levelCommissionPct: number[];
  /** Minimum monthlyBV a partner must have for THEIR OWN level-2+ override commissions to pay out (level 1 always pays). */
  minActiveBVForOverride: number;
  partnerDiscountTiers: { minBV: number; pct: number }[];
  wholesaleDefaultDiscountPct: number;
  wholesaleDefaultMinQty: number;
  minWithdrawal: number;
  loyaltyRsPerPoint: number;
  pointValueRs: number;
  minRedeemPoints: number;
  rsPerBV: number;
  couponsForMembers: boolean;
  /** Group-BV (own + entire downline) rank ladder. Ranks never downgrade once reached. */
  ranks: { rank: string; minGroupBV: number; bonus: number }[];
};

export const RANK_ORDER = ['Member', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'] as const;

export const MEMBER_DEFAULTS: MemberSettings = {
  referralCommissionPct: 10,
  levelCommissionPct: [10, 5, 3, 2, 1],
  minActiveBVForOverride: 30,
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
  ranks: [
    { rank: 'Bronze', minGroupBV: 200, bonus: 500 },
    { rank: 'Silver', minGroupBV: 1000, bonus: 1500 },
    { rank: 'Gold', minGroupBV: 3000, bonus: 5000 },
    { rank: 'Platinum', minGroupBV: 10000, bonus: 15000 },
    { rank: 'Diamond', minGroupBV: 30000, bonus: 50000 },
  ],
};

export async function getMemberSettings(): Promise<MemberSettings> {
  const s = await getSettings();
  const m = { ...MEMBER_DEFAULTS, ...(s.members ?? {}) };
  m.partnerDiscountTiers = [...(m.partnerDiscountTiers ?? MEMBER_DEFAULTS.partnerDiscountTiers)].sort((a, b) => a.minBV - b.minBV);
  m.levelCommissionPct = m.levelCommissionPct?.length ? m.levelCommissionPct : MEMBER_DEFAULTS.levelCommissionPct;
  m.ranks = [...(m.ranks?.length ? m.ranks : MEMBER_DEFAULTS.ranks)].sort((a, b) => a.minGroupBV - b.minGroupBV);
  // Keep the deprecated single field in sync with level 1 so old code/reports reading it still see the right number.
  m.referralCommissionPct = m.levelCommissionPct[0] ?? 0;
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
// CNIC fraud check: one real person should not run two partner/KYC accounts
// ---------------------------------------------------------------------------

/**
 * Looks for ANY other user who already has this CNIC number on an approved
 * or pending Brand Partner application or payout (KYC) submission — i.e.
 * someone already using this exact ID to become a partner or get verified
 * for payouts. Rejected applications don't block a retry with the same
 * CNIC (that account was turned down, not confirmed as a duplicate-abuse
 * case), and a user re-submitting their OWN application never blocks
 * themselves. `digits` must already be the CNIC with dashes stripped.
 */
export async function findCnicConflict(digits: string, currentUserId: string): Promise<{ userId: string; kind: 'partner' | 'kyc' } | null> {
  const matches = await db.users.find({ $or: [{ 'partner.cnic': digits }, { 'kyc.cnic': digits }] }, { limit: 20 });
  for (const other of matches) {
    if (other._id === currentUserId) continue;
    if (other.partner?.cnic === digits && ['approved', 'pending'].includes(other.partner?.status)) return { userId: other._id, kind: 'partner' };
    if (other.kyc?.cnic === digits && ['approved', 'pending'].includes(other.kyc?.status)) return { userId: other._id, kind: 'kyc' };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Level-wise team (multi-level commissions and group BV / rank)
// ---------------------------------------------------------------------------

/**
 * Walk up from `startSponsor` through `referredBy` links, returning every
 * approved+active partner ancestor in order (index 0 = direct sponsor /
 * level 1, index 1 = level 2, ...), stopping at `maxLevels` or the first
 * broken/inactive link. A cycle (shouldn't happen, but data can be edited by
 * hand) is also a safe stop condition via the `seen` set.
 */
export async function sponsorChain(startSponsor: Doc | null, maxLevels: number): Promise<Doc[]> {
  const chain: Doc[] = [];
  const seen = new Set<string>();
  let current: Doc | null = startSponsor;
  while (current && chain.length < maxLevels && !seen.has(current._id)) {
    if (!isPartner(current) || current.isActive === false) break;
    seen.add(current._id);
    chain.push(current);
    current = current.referredBy ? await db.users.findById(current.referredBy) : null;
  }
  return chain;
}

/** The highest rank whose minGroupBV is at or below `groupBV`, or null if below the first rank. */
export function rankForGroupBV(settings: MemberSettings, groupBV: number): string | null {
  let best: string | null = null;
  for (const r of settings.ranks) if (groupBV >= r.minGroupBV) best = r.rank;
  return best;
}

/** How far a member is from their next rank, for a progress bar. */
export function nextRank(settings: MemberSettings, currentRank: string, groupBV: number) {
  const idx = RANK_ORDER.indexOf((currentRank as (typeof RANK_ORDER)[number]) ?? 'Member');
  const next = settings.ranks.find((r) => RANK_ORDER.indexOf(r.rank as (typeof RANK_ORDER)[number]) > idx);
  if (!next) return null;
  return { rank: next.rank, minGroupBV: next.minGroupBV, bonus: next.bonus, remaining: Math.max(0, next.minGroupBV - groupBV) };
}

/**
 * Add `bv` to groupBV for every ancestor in `chain` (their own + their whole
 * downline's volume), and promote anyone who has just crossed into a new
 * rank — crediting that rank's one-time bonus to their wallet. Ranks never
 * downgrade, even if `bv` is later reversed (a cancelled order shouldn't take
 * back a trip/title someone already earned).
 */
export async function creditGroupBVAndRank(chain: Doc[], bv: number) {
  if (!bv || !chain.length) return;
  const settings = await getMemberSettings();
  for (const ancestor of chain) {
    await bumpUserCounter(ancestor._id, 'groupBV', bv);
    const fresh = await db.users.findById(ancestor._id);
    if (!fresh) continue;
    const newGroupBV = Number(fresh.groupBV ?? 0);
    const achieved = rankForGroupBV(settings, newGroupBV);
    const achievedIdx = achieved ? RANK_ORDER.indexOf(achieved as (typeof RANK_ORDER)[number]) : 0;
    const currentIdx = RANK_ORDER.indexOf((fresh.rank as (typeof RANK_ORDER)[number]) ?? 'Member');
    if (achieved && achievedIdx > currentIdx) {
      const bonus = settings.ranks
        .filter((r) => RANK_ORDER.indexOf(r.rank as (typeof RANK_ORDER)[number]) > currentIdx && RANK_ORDER.indexOf(r.rank as (typeof RANK_ORDER)[number]) <= achievedIdx)
        .reduce((s, r) => s + r.bonus, 0);
      await db.users.updateById(ancestor._id, { rank: achieved });
      if (bonus > 0) {
        await postEntries([
          {
            user: ancestor._id,
            type: 'commission',
            amount: bonus,
            status: 'available',
            note: `Rank achievement bonus: ${achieved}`,
          },
        ]);
      }
      await createNotification({
        userId: ancestor._id,
        type: 'general',
        title: 'Rank upgraded',
        message: `Congratulations! You reached ${achieved} rank${bonus > 0 ? ` and earned a Rs. ${bonus.toLocaleString()} bonus` : ''}.`,
        link: '/account/partner',
      });
    }
  }
}

/** Reverse a BV credit along the chain (order cancelled/refunded). Does not touch rank or its bonus — already earned, kept. */
export async function reverseGroupBV(chain: Doc[], bv: number) {
  if (!bv || !chain.length) return;
  for (const ancestor of chain) await bumpUserCounter(ancestor._id, 'groupBV', -bv);
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
export async function bumpUserCounter(userId: string, field: 'loyaltyPoints' | 'monthlyBV' | 'totalBV' | 'referredBV' | 'groupBV', delta: number) {
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
 * Called right after an order is created. Books a pending commission for
 * every level in the sponsor chain (level 1 = direct sponsor, up to 5 by
 * default), credits points (BV) to the buyer (if a partner), and credits
 * group BV + checks rank promotions for every ancestor in the chain —
 * including ancestors beyond the paid commission levels, since rank is
 * about team size, not just who gets paid on this order.
 */
export async function onOrderPlaced(order: Doc) {
  try {
    const m = order.member ?? {};
    if (order.user && m.bv && m.buyerType === 'partner') {
      await bumpUserCounter(order.user, 'monthlyBV', m.bv);
      await bumpUserCounter(order.user, 'totalBV', m.bv);
    }

    // Multi-level commissions (new order shape). Falls back to the single
    // m.sponsor/m.commission shape for any order placed before this existed.
    const levels: { sponsor: string; sponsorCode?: string; level: number; pct: number; amount: number }[] =
      m.commissions?.length ? m.commissions : m.sponsor && m.commission > 0 ? [{ sponsor: m.sponsor, level: 1, pct: m.commissionPct, amount: m.commission }] : [];

    for (const lvl of levels) {
      if (!(lvl.amount > 0)) continue;
      await postEntries([
        {
          user: lvl.sponsor,
          type: 'commission',
          amount: lvl.amount,
          status: 'pending',
          order: order._id,
          orderNumber: order.orderNumber,
          fromUser: order.user ?? undefined,
          note: `Level ${lvl.level} (${lvl.pct}%) commission on order ${order.orderNumber}`,
        },
      ]);
      if (lvl.level === 1 && m.bv) await bumpUserCounter(lvl.sponsor, 'referredBV', m.bv);
      await createNotification({
        userId: lvl.sponsor,
        type: 'general',
        title: lvl.level === 1 ? 'New referral order' : `Level ${lvl.level} team order`,
        message: `Order ${order.orderNumber} earns you Rs. ${lvl.amount.toLocaleString()} once it is delivered.`,
        link: '/account/partner',
      });
    }

    // Group BV + rank: credit the WHOLE ancestor chain, even past the paid
    // levels, and regardless of whether the buyer is a partner or a plain
    // customer who bought through a partner's link (that's real team volume).
    if (m.bv && m.sponsor) {
      const directSponsor = await db.users.findById(m.sponsor);
      const chain = await sponsorChain(directSponsor, 10);
      await creditGroupBVAndRank(chain, m.bv);
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
    // Every pending-or-available commission entry for this order — there can
    // be several now (one per sponsor level), not just one.
    const commissionRows = await sql`select _id, data from wallet_entries where "order" = ${order._id} and type = 'commission' and data->>'note' not like 'Rank achievement bonus%'`;

    if (status === 'delivered' && !CLOSED.includes(previousStatus)) {
      // Commissions become spendable; loyalty points are earned
      for (const row of commissionRows as any[]) {
        if (row.data.status === 'pending') {
          await setEntryStatus(row._id, 'available', { releasedAt: new Date().toISOString() });
          await createNotification({
            userId: row.data.user,
            type: 'general',
            title: 'Commission added to your wallet',
            message: `Rs. ${Number(row.data.amount).toLocaleString()} from order ${order.orderNumber} is now available.`,
            link: '/account/partner?tab=wallet',
          });
        }
      }
      if (order.user && m.pointsEarned > 0 && !m.pointsCredited) {
        await bumpUserCounter(order.user, 'loyaltyPoints', m.pointsEarned);
        await db.orders.updateById(order._id, { member: { ...m, pointsCredited: true } });
        order.member = { ...m, pointsCredited: true };
      }
    }

    if (CLOSED.includes(status) && !CLOSED.includes(previousStatus)) {
      const entries: EntryInput[] = [];
      for (const row of commissionRows as any[]) {
        if (row.data.status === 'pending') {
          await setEntryStatus(row._id, 'cancelled', { cancelledAt: new Date().toISOString() });
        } else if (row.data.status === 'available') {
          entries.push({
            user: row.data.user,
            type: 'commission_reversal',
            amount: -Number(row.data.amount),
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
        // Take back what's left if some of the earned points were already spent
        const u = await db.users.findById(order.user);
        const back = Math.min(m.pointsEarned, Number(u?.loyaltyPoints ?? 0));
        if (back > 0) await bumpUserCounter(order.user, 'loyaltyPoints', -back);
      }
      if (order.user && m.bv && m.buyerType === 'partner' && !m.bvReversed) {
        await bumpUserCounter(order.user, 'monthlyBV', -m.bv);
        await bumpUserCounter(order.user, 'totalBV', -m.bv);
      }
      if (m.sponsor && m.bv && !m.bvReversed) {
        await bumpUserCounter(m.sponsor, 'referredBV', -m.bv);
        const directSponsor = await db.users.findById(m.sponsor);
        const chain = await sponsorChain(directSponsor, 10);
        await reverseGroupBV(chain, m.bv);
      }
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

/** Admin edited an order's lines: keep each still-pending, per-level commission in step with the new total. */
export async function recalcPendingCommission(order: Doc) {
  const m = order.member ?? {};
  const merchandise = Math.max(0, (order.subtotal ?? 0) - (order.discount ?? 0) - (order.manualDiscount ?? 0));
  const sql = getSql();
  const now = new Date().toISOString();

  const levels: { sponsor: string; level: number; pct: number }[] =
    m.commissions?.length ? m.commissions : m.sponsor && m.commissionPct ? [{ sponsor: m.sponsor, level: 1, pct: m.commissionPct }] : [];
  if (!levels.length) return;

  let newCommissions = m.commissions ?? [];
  for (const lvl of levels) {
    const amount = round((merchandise * lvl.pct) / 100);
    // Matched by sponsor (user), not by level text in the note — robust even
    // for orders placed before per-level notes existed.
    await sql`update wallet_entries set data = data || ${JSON.stringify({ amount, updatedAt: now })}::text::jsonb, updated_at = ${now}
              where "order" = ${order._id} and type = 'commission' and status = 'pending' and "user" = ${lvl.sponsor}`;
    newCommissions = newCommissions.map((c: any) => (c.level === lvl.level ? { ...c, amount } : c));
  }
  const newCommission = newCommissions.find((c: any) => c.level === 1)?.amount ?? 0;
  await db.orders.updateById(order._id, { member: { ...m, commission: newCommission, commissions: newCommissions } });
}

export { postCredits };
