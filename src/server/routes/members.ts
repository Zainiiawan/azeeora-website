import { z } from 'zod';
import { db, getSql, Doc } from '../db';
import { Router, json, validate, authenticate, adminOnly, BadRequestError, NotFoundError, ForbiddenError } from '../http';
import { createNotification, notifyAdmins, getSettings, applyProductDiscount } from '../commerce';
import { sendMembershipStatusEmail } from '../email';
import {
  MEMBER_DEFAULTS,
  accountType,
  getMemberSettings,
  isBusiness,
  isPartner,
  nextRank,
  nextTier,
  partnerDiscountPct,
  postEntries,
  postCredits,
  uniqueMemberCode,
  walletSummary,
  wholesaleTerms,
  findSponsor,
  findCnicConflict,
} from '../members';

export const members = new Router();

const phone = z.string().min(7).max(20);
const cnic = z.string().regex(/^\d{5}-?\d{7}-?\d$/, 'CNIC must be 13 digits, e.g. 35202-1234567-1');

const maskName = (u: Doc) => `${u.firstName ?? ''} ${String(u.lastName ?? '').slice(0, 1)}.`.trim();

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000')
  );
}

/** Everything the account screens need about the signed-in member. */
async function memberProfile(u: Doc) {
  const ms = await getMemberSettings();
  const type = accountType(u);
  const monthlyBV = Number(u.monthlyBV ?? 0);
  const profile: Record<string, any> = {
    accountType: type,
    memberCode: u.memberCode ?? null,
    partner: u.partner ?? null,
    business: u.business ?? null,
    kyc: u.kyc ? { ...u.kyc, accountNumber: u.kyc.accountNumber ? `•••• ${String(u.kyc.accountNumber).slice(-4)}` : undefined } : null,
    loyaltyPoints: Number(u.loyaltyPoints ?? 0),
    monthlyBV,
    lastMonthBV: Number(u.lastMonthBV ?? 0),
    totalBV: Number(u.totalBV ?? 0),
    referredBV: Number(u.referredBV ?? 0),
    groupBV: Number(u.groupBV ?? 0),
    rank: u.rank ?? 'Member',
    wallet: await walletSummary(u._id),
    settings: {
      referralCommissionPct: ms.referralCommissionPct,
      levelCommissionPct: ms.levelCommissionPct,
      partnerDiscountTiers: ms.partnerDiscountTiers,
      ranks: ms.ranks,
      minWithdrawal: ms.minWithdrawal,
      minRedeemPoints: ms.minRedeemPoints,
      pointValueRs: ms.pointValueRs,
      loyaltyRsPerPoint: ms.loyaltyRsPerPoint,
      wholesaleDefaultDiscountPct: ms.wholesaleDefaultDiscountPct,
      wholesaleDefaultMinQty: ms.wholesaleDefaultMinQty,
    },
  };
  if (type === 'partner') {
    profile.discountPct = partnerDiscountPct(ms, monthlyBV);
    profile.nextTier = nextTier(ms, monthlyBV);
    profile.nextRank = nextRank(ms, u.rank ?? 'Member', Number(u.groupBV ?? 0));
    profile.links = {
      store: `${siteUrl()}/?ref=${u.memberCode}`,
      join: `${siteUrl()}/join?ref=${u.memberCode}`,
    };
  }
  if (u.referredBy) {
    const s = await db.users.findById(u.referredBy);
    if (s) profile.sponsor = { name: maskName(s), memberCode: s.memberCode };
  }
  return profile;
}

// ---------------------------------------------------------------------------
// Public
// ---------------------------------------------------------------------------
members.get('/ref/:code', async ({ params }) => {
  const s = await findSponsor(params.code);
  return json({ success: true, message: 'Referral code', data: s ? { valid: true, name: maskName(s), memberCode: s.memberCode } : { valid: false } });
});

members.get('/programme', async () => {
  const ms = await getMemberSettings();
  return json({
    success: true,
    message: 'Programme',
    data: {
      referralCommissionPct: ms.referralCommissionPct,
      levelCommissionPct: ms.levelCommissionPct,
      partnerDiscountTiers: ms.partnerDiscountTiers,
      ranks: ms.ranks,
      wholesaleDefaultDiscountPct: ms.wholesaleDefaultDiscountPct,
      wholesaleDefaultMinQty: ms.wholesaleDefaultMinQty,
      minWithdrawal: ms.minWithdrawal,
      loyaltyRsPerPoint: ms.loyaltyRsPerPoint,
      pointValueRs: ms.pointValueRs,
      minRedeemPoints: ms.minRedeemPoints,
    },
  });
});

// ---------------------------------------------------------------------------
// Signed-in member
// ---------------------------------------------------------------------------
members.get('/me', authenticate, async ({ user }) => {
  const u = await db.users.findById(user!._id);
  if (!u) throw new NotFoundError('User');
  return json({ success: true, message: 'Member profile', data: await memberProfile(u) });
});

const partnerApplySchema = z.object({
  phone,
  whatsapp: z.string().max(20).optional(),
  cnic,
  fullNameOnCnic: z.string().min(2).max(80),
  fatherName: z.string().min(2).max(80),
  cnicFrontImage: z.string().url().optional().or(z.literal('')).or(z.null()),
  cnicBackImage: z.string().url().optional().or(z.literal('')).or(z.null()),
  city: z.string().min(2).max(60),
  address: z.string().max(200).optional(),
  dateOfBirth: z.string().max(20).optional(),
  experience: z.string().max(500).optional(),
  refCode: z.string().max(20).optional(),
  agreeTerms: z.literal(true, { errorMap: () => ({ message: 'Please accept the Brand Partner terms' }) }),
});

members.post('/partner/apply', authenticate, validate(partnerApplySchema), async ({ body, user }) => {
  const u = await db.users.findById(user!._id);
  if (!u) throw new NotFoundError('User');
  if (u.role === 'admin') throw new BadRequestError('Admin accounts cannot join as partners');
  if (isBusiness(u)) throw new BadRequestError('Wholesale accounts cannot also be Brand Partners');
  if (u.partner?.status === 'approved') throw new BadRequestError('You are already a Brand Partner');
  if (u.partner?.status === 'pending') throw new BadRequestError('Your application is already under review');
  if (u.partner?.status === 'suspended') throw new ForbiddenError('Your partner account is suspended. Please contact us.');

  const cnicDigits = body.cnic.replace(/-/g, '');
  const conflict = await findCnicConflict(cnicDigits, u._id);
  if (conflict) {
    await notifyAdmins({
      type: 'general',
      title: 'Blocked duplicate CNIC signup',
      message: `${u.firstName} ${u.lastName} (${u.email}) tried to apply as a Brand Partner with a CNIC already on file for another account.`,
      link: '/admin/members?tab=partners',
    });
    throw new BadRequestError('This CNIC number is already registered on another account. One CNIC cannot be used for multiple accounts.');
  }

  if (!u.referredBy && body.refCode) {
    const s = await findSponsor(body.refCode);
    if (!s) throw new BadRequestError('That referral code is not valid');
    if (s._id !== u._id) Object.assign(u, { referredBy: s._id, referredAt: new Date().toISOString() });
  }
  const { agreeTerms, refCode, ...details } = body;
  void agreeTerms;
  void refCode;
  u.partner = { ...details, cnic: cnicDigits, status: 'pending', appliedAt: new Date().toISOString() };
  u.cnic = cnicDigits;
  if (!u.phone) u.phone = body.phone;
  await db.users.save(u);
  await notifyAdmins({ type: 'general', title: 'New Brand Partner application', message: `${u.firstName} ${u.lastName} applied to become a Brand Partner.`, link: '/admin/members?tab=partners' });
  return json({ success: true, message: 'Application received. We will review it shortly.', data: await memberProfile(u) }, 201);
});

const businessApplySchema = z.object({
  companyName: z.string().min(2).max(120),
  businessType: z.enum(['salon', 'retail_shop', 'pharmacy', 'distributor', 'online_store', 'other']),
  contactPhone: phone,
  city: z.string().min(2).max(60),
  address: z.string().min(5).max(250),
  ntn: z.string().max(20).optional(),
  monthlyVolume: z.string().max(60).optional(),
  notes: z.string().max(500).optional(),
});

members.post('/business/apply', authenticate, validate(businessApplySchema), async ({ body, user }) => {
  const u = await db.users.findById(user!._id);
  if (!u) throw new NotFoundError('User');
  if (u.role === 'admin') throw new BadRequestError('Admin accounts cannot open wholesale accounts');
  if (isPartner(u)) throw new BadRequestError('Brand Partner accounts cannot also be wholesale accounts');
  if (u.business?.status === 'approved') throw new BadRequestError('Your wholesale account is already active');
  if (u.business?.status === 'pending') throw new BadRequestError('Your application is already under review');
  if (u.business?.status === 'suspended') throw new ForbiddenError('Your wholesale account is suspended. Please contact us.');
  u.business = { ...body, status: 'pending', appliedAt: new Date().toISOString() };
  await db.users.save(u);
  await notifyAdmins({ type: 'general', title: 'New wholesale application', message: `${body.companyName} (${u.firstName} ${u.lastName}) applied for a wholesale account.`, link: '/admin/members?tab=business' });
  return json({ success: true, message: 'Application received. We will review it shortly.', data: await memberProfile(u) }, 201);
});

const kycSchema = z.object({
  cnic,
  fullNameOnCnic: z.string().min(2).max(80),
  fatherName: z.string().min(2).max(80),
  cnicFrontImage: z.string().url().optional().or(z.literal('')).or(z.null()),
  cnicBackImage: z.string().url().optional().or(z.literal('')).or(z.null()),
  method: z.enum(['bank', 'jazzcash', 'easypaisa']),
  accountTitle: z.string().min(2).max(80),
  accountNumber: z.string().min(6).max(34),
  bankName: z.string().max(80).optional(),
});

members.post('/kyc', authenticate, validate(kycSchema), async ({ body, user }) => {
  const u = await db.users.findById(user!._id);
  if (!u) throw new NotFoundError('User');
  if (u.kyc?.status === 'pending') throw new BadRequestError('Your details are already under review');
  if (body.method === 'bank' && !body.bankName) throw new BadRequestError('Bank name is required');

  const cnicDigits = body.cnic.replace(/-/g, '');
  const conflict = await findCnicConflict(cnicDigits, u._id);
  if (conflict) {
    await notifyAdmins({
      type: 'general',
      title: 'Blocked duplicate CNIC payout submission',
      message: `${u.firstName} ${u.lastName} (${u.email}) tried to submit payout details with a CNIC already on file for another account.`,
      link: '/admin/members?tab=kyc',
    });
    throw new BadRequestError('This CNIC number is already registered on another account. One CNIC cannot be used for multiple accounts.');
  }

  u.kyc = { ...body, cnic: cnicDigits, status: 'pending', submittedAt: new Date().toISOString() };
  u.cnic = cnicDigits;
  await db.users.save(u);
  await notifyAdmins({ type: 'general', title: 'Payout details to verify', message: `${u.firstName} ${u.lastName} submitted payout details.`, link: '/admin/members?tab=kyc' });
  return json({ success: true, message: 'Details submitted for verification', data: await memberProfile(u) }, 201);
});

members.get('/referrals', authenticate, async ({ user }) => {
  const u = await db.users.findById(user!._id);
  if (!isPartner(u)) throw new ForbiddenError('Only Brand Partners have referrals');
  const sql = getSql();
  const ms = await getMemberSettings();
  const people = await db.users.find({ referredBy: u!._id }, { sort: { createdAt: -1 }, limit: 500 });
  const commissions = await sql`
    select coalesce(sum(case when status <> 'cancelled' then (data->>'amount')::numeric end),0) as total, data->>'fromUser' as from_user, count(*)::int as orders
    from wallet_entries where "user" = ${u!._id} and type = 'commission' group by data->>'fromUser'`;
  const byUser = new Map(commissions.map((r: any) => [r.from_user, r]));
  const list = people.map((p) => {
    const c: any = byUser.get(p._id);
    return {
      _id: p._id,
      name: maskName(p),
      joinedAt: p.referredAt ?? p.createdAt,
      type: accountType(p),
      orders: c ? c.orders : 0,
      commission: c ? Number(c.total) : 0,
    };
  });
  const guest: any = byUser.get(null as any);

  // Level-wise team: breadth-first down the referredBy tree, up to the same
  // depth as paid commission levels. perLevel counts everyone (not just
  // partners) because customers count toward group BV too.
  const maxLevels = ms.levelCommissionPct.length;
  const perLevel: { level: number; count: number; partners: number }[] = [];
  const treeNodes: {
    _id: string;
    name: string;
    memberCode: string | null;
    level: number;
    sponsorId: string;
    type: 'business' | 'partner' | 'customer';
    rank: string;
    monthlyBV: number;
    groupBV: number;
    joinedAt: string;
  }[] = [];
  let frontier = [u!._id];
  const seen = new Set([u!._id]);
  for (let level = 1; level <= maxLevels && frontier.length; level++) {
    const next = await db.users.find({ referredBy: { $in: frontier } }, { limit: 2000 });
    const fresh = next.filter((p) => !seen.has(p._id));
    fresh.forEach((p) => {
      seen.add(p._id);
      treeNodes.push({
        _id: p._id,
        name: maskName(p),
        memberCode: p.memberCode ?? null,
        level,
        sponsorId: p.referredBy,
        type: accountType(p),
        rank: p.rank ?? 'Member',
        monthlyBV: Number(p.monthlyBV ?? 0),
        groupBV: Number(p.groupBV ?? 0),
        joinedAt: p.referredAt ?? p.createdAt,
      });
    });
    perLevel.push({ level, count: fresh.length, partners: fresh.filter((p) => isPartner(p)).length });
    frontier = fresh.map((p) => p._id);
  }

  // Level-wise commission earnings
  const levelEarningsRows = await sql`
    select
      substring(data->>'note' from 'Level ([0-9]+)') as lvl,
      coalesce(sum(case when status <> 'cancelled' then (data->>'amount')::numeric end), 0) as total,
      count(*)::int as orders
    from wallet_entries
    where "user" = ${u!._id} and type = 'commission' and data->>'note' like 'Level %'
    group by lvl`;
  const levelCommissions = ms.levelCommissionPct.map((pct, idx) => {
    const lvlNum = String(idx + 1);
    const row: any = (levelEarningsRows as any[]).find((r) => r.lvl === lvlNum);
    return {
      level: idx + 1,
      pct,
      orders: row ? Number(row.orders) : 0,
      amount: row ? Number(row.total) : 0,
    };
  });

  return json({
    success: true,
    message: 'Referrals',
    data: {
      people: list,
      tree: treeNodes,
      levelCommissions,
      guestOrders: guest ? { orders: guest.orders, commission: Number(guest.total) } : { orders: 0, commission: 0 },
      team: { totalMembers: seen.size - 1, perLevel, groupBV: Number(u!.groupBV ?? 0), rank: u!.rank ?? 'Member' },
    },
  });
});

members.get('/wallet', authenticate, async ({ user, query }) => {
  const sql = getSql();
  const limit = Math.min(200, Number(query.limit ?? 50));
  const rows = await sql`select _id, data from wallet_entries where "user" = ${user!._id} order by created_at desc limit ${limit}`;
  const withdrawals = await db.withdrawals.find({ user: user!._id }, { sort: { createdAt: -1 }, limit: 50 });
  return json({
    success: true,
    message: 'Wallet',
    data: {
      summary: await walletSummary(user!._id),
      entries: rows.map((r: any) => ({ _id: r._id, ...r.data })),
      withdrawals,
    },
  });
});

const withdrawSchema = z.object({ amount: z.number().positive() });

members.post('/withdrawals', authenticate, validate(withdrawSchema), async ({ body, user }) => {
  const u = await db.users.findById(user!._id);
  if (!u) throw new NotFoundError('User');
  const ms = await getMemberSettings();
  if (u.kyc?.status !== 'approved') throw new BadRequestError('Verify your payout details before withdrawing');
  const amount = Math.floor(body.amount);
  if (amount < ms.minWithdrawal) throw new BadRequestError(`The minimum withdrawal is Rs. ${ms.minWithdrawal.toLocaleString()}`);
  const pending = await db.withdrawals.count({ user: u._id, status: 'requested' });
  if (pending > 0) throw new BadRequestError('You already have a withdrawal waiting to be paid');

  const w = await db.withdrawals.create({
    user: u._id,
    amount,
    status: 'requested',
    method: u.kyc.method,
    accountTitle: u.kyc.accountTitle,
    accountNumber: u.kyc.accountNumber,
    bankName: u.kyc.bankName,
    memberCode: u.memberCode,
    name: `${u.firstName} ${u.lastName}`,
  });
  try {
    // Holds the money now (fails cleanly if the balance is too low)
    await postEntries([{ user: u._id, type: 'withdrawal', amount: -amount, status: 'available', withdrawal: w._id, note: `Withdrawal to ${u.kyc.method === 'bank' ? u.kyc.bankName : u.kyc.method}` }]);
  } catch (err) {
    await db.withdrawals.deleteById(w._id);
    throw err;
  }
  await notifyAdmins({ type: 'general', title: 'Withdrawal request', message: `${u.firstName} ${u.lastName} requested Rs. ${amount.toLocaleString()}.`, link: '/admin/members?tab=withdrawals' });
  return json({ success: true, message: 'Withdrawal requested', data: w }, 201);
});

members.get('/wholesale-prices', authenticate, async ({ user }) => {
  const u = await db.users.findById(user!._id);
  if (!isBusiness(u)) throw new ForbiddenError('Only approved wholesale accounts can see wholesale prices');
  const ms = await getMemberSettings();
  const products = await db.products.find({ isActive: true }, { sort: { name: 1 } });
  const data = products.map((p) => {
    const retail = applyProductDiscount(p, p.basePrice);
    const t = wholesaleTerms(p, retail, ms);
    return { productId: p._id, slug: p.slug, name: p.name, image: p.images?.[0]?.url ?? '', retailPrice: retail, price: Math.min(retail, t.price), minQty: t.minQty, stock: p.stock };
  });
  return json({ success: true, message: 'Wholesale prices', data });
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
const adminUser = (u: Doc) => ({
  _id: u._id,
  firstName: u.firstName,
  lastName: u.lastName,
  email: u.email,
  phone: u.phone,
  memberCode: u.memberCode,
  partner: u.partner,
  business: u.business,
  kyc: u.kyc,
  referredBy: u.referredBy,
  monthlyBV: u.monthlyBV ?? 0,
  totalBV: u.totalBV ?? 0,
  referredBV: u.referredBV ?? 0,
  groupBV: u.groupBV ?? 0,
  rank: u.rank ?? 'Member',
  loyaltyPoints: u.loyaltyPoints ?? 0,
  createdAt: u.createdAt,
});

members.get('/admin/overview', adminOnly, async () => {
  const sql = getSql();
  const counts = await sql`
    select
      count(*) filter (where data#>>'{partner,status}' = 'approved')::int as partners,
      count(*) filter (where data#>>'{partner,status}' = 'pending')::int as partner_pending,
      count(*) filter (where data#>>'{business,status}' = 'approved')::int as businesses,
      count(*) filter (where data#>>'{business,status}' = 'pending')::int as business_pending,
      count(*) filter (where data#>>'{kyc,status}' = 'pending')::int as kyc_pending
    from users`;
  const money = await sql`
    select
      coalesce(sum(case when type='commission' and status='pending' then (data->>'amount')::numeric end),0) as commission_pending,
      coalesce(sum(case when type='commission' and status='available' then (data->>'amount')::numeric end),0) as commission_released,
      coalesce(sum(case when status='available' then (data->>'amount')::numeric end),0) as wallet_liability
    from wallet_entries`;
  const wd = await sql`select count(*)::int as n, coalesce(sum((data->>'amount')::numeric),0) as amt from withdrawals where status = 'requested'`;
  const c: any = counts[0];
  const m: any = money[0];
  return json({
    success: true,
    message: 'Members overview',
    data: {
      partners: c.partners,
      partnerPending: c.partner_pending,
      businesses: c.businesses,
      businessPending: c.business_pending,
      kycPending: c.kyc_pending,
      commissionPending: Number(m.commission_pending),
      commissionReleased: Number(m.commission_released),
      walletLiability: Number(m.wallet_liability),
      withdrawalsRequested: wd[0].n,
      withdrawalsRequestedAmount: Number(wd[0].amt),
    },
  });
});

members.get('/admin/list', adminOnly, async ({ query }) => {
  const kind = String(query.kind ?? 'partner'); // partner | business | kyc
  const status = query.status ? String(query.status) : undefined;
  const field = kind === 'business' ? 'business.status' : kind === 'kyc' ? 'kyc.status' : 'partner.status';
  const filter: Record<string, any> = status ? { [field]: status } : { [field]: { $in: ['pending', 'approved', 'rejected', 'suspended'] } };
  const list = await db.users.find(filter, { sort: { updatedAt: -1 }, limit: 500 });
  const sponsorIds = Array.from(new Set(list.map((u) => u.referredBy).filter(Boolean)));
  const sponsors = new Map((await db.users.findByIds(sponsorIds)).map((s) => [s._id, s]));
  const data = await Promise.all(
    list.map(async (u) => ({
      ...adminUser(u),
      sponsor: u.referredBy && sponsors.get(u.referredBy) ? { name: maskName(sponsors.get(u.referredBy)!), memberCode: sponsors.get(u.referredBy)!.memberCode } : null,
      wallet: kind === 'partner' ? await walletSummary(u._id) : undefined,
    }))
  );
  return json({ success: true, message: 'Members', data });
});

members.get('/admin/withdrawals', adminOnly, async ({ query }) => {
  const filter = query.status ? { status: String(query.status) } : {};
  const list = await db.withdrawals.find(filter, { sort: { createdAt: -1 }, limit: 500 });
  return json({ success: true, message: 'Withdrawals', data: list });
});

const payoutSchema = z.object({ action: z.enum(['paid', 'reject']), reference: z.string().max(80).optional(), note: z.string().max(300).optional() });

members.post('/admin/withdrawals/:id', adminOnly, validate(payoutSchema), async ({ params, body, user: admin }) => {
  const w = await db.withdrawals.findById(params.id);
  if (!w) throw new NotFoundError('Withdrawal');
  if (w.status !== 'requested') throw new BadRequestError('This withdrawal is already closed');
  const now = new Date().toISOString();
  if (body.action === 'paid') {
    if (!body.reference) throw new BadRequestError('Enter the transfer reference');
    Object.assign(w, { status: 'paid', reference: body.reference, note: body.note, processedAt: now, processedBy: admin!._id });
    await db.withdrawals.save(w);
    await createNotification({ userId: w.user, type: 'general', title: 'Withdrawal paid', message: `Rs. ${Number(w.amount).toLocaleString()} was sent to your ${w.method} account (ref ${body.reference}).`, link: '/account/partner?tab=wallet' });
  } else {
    Object.assign(w, { status: 'rejected', note: body.note, processedAt: now, processedBy: admin!._id });
    await db.withdrawals.save(w);
    await postCredits([{ user: w.user, type: 'withdrawal_reversal', amount: Number(w.amount), status: 'available', withdrawal: w._id, note: `Withdrawal returned${body.note ? `: ${body.note}` : ''}` }]);
    await createNotification({ userId: w.user, type: 'general', title: 'Withdrawal returned', message: `Your withdrawal of Rs. ${Number(w.amount).toLocaleString()} was returned to your wallet.${body.note ? ` ${body.note}` : ''}`, link: '/account/partner?tab=wallet' });
  }
  return json({ success: true, message: 'Withdrawal updated', data: w });
});

members.get('/admin/commissions', adminOnly, async ({ query }) => {
  const sql = getSql();
  const status = query.status ? String(query.status) : null;
  const rows = status
    ? await sql`select _id, data from wallet_entries where type in ('commission','commission_reversal') and status = ${status} order by created_at desc limit 500`
    : await sql`select _id, data from wallet_entries where type in ('commission','commission_reversal') order by created_at desc limit 500`;
  const entries = rows.map((r: any) => ({ _id: r._id, ...r.data }));
  const users = new Map((await db.users.findByIds(Array.from(new Set(entries.map((e) => e.user))))).map((u) => [u._id, u]));
  return json({
    success: true,
    message: 'Commissions',
    data: entries.map((e) => ({ ...e, partner: users.get(e.user) ? { name: `${users.get(e.user)!.firstName} ${users.get(e.user)!.lastName}`, memberCode: users.get(e.user)!.memberCode } : null })),
  });
});

const adjustSchema = z.object({ userId: z.string(), amount: z.number().refine((n) => n !== 0, 'Amount cannot be zero'), note: z.string().min(3).max(200) });

members.post('/admin/wallet-adjust', adminOnly, validate(adjustSchema), async ({ body, user: admin }) => {
  const u = await db.users.findById(body.userId);
  if (!u) throw new NotFoundError('User');
  const entry = { user: u._id, type: 'adjustment' as const, amount: body.amount, status: 'available' as const, note: `${body.note} (by ${admin!.firstName})` };
  if (body.amount < 0) await postEntries([entry]);
  else await postCredits([entry]);
  await createNotification({ userId: u._id, type: 'general', title: 'Wallet adjusted', message: `${body.amount > 0 ? 'Rs. ' + body.amount + ' added to' : 'Rs. ' + -body.amount + ' deducted from'} your wallet: ${body.note}`, link: '/account/partner?tab=wallet' });
  return json({ success: true, message: 'Wallet adjusted', data: await walletSummary(u._id) });
});

const settingsSchema = z.object({
  referralCommissionPct: z.number().min(0).max(50),
  levelCommissionPct: z.array(z.number().min(0).max(50)).min(1).max(10),
  minActiveBVForOverride: z.number().min(0),
  partnerDiscountTiers: z.array(z.object({ minBV: z.number().min(0), pct: z.number().min(0).max(80) })).min(1).max(10),
  ranks: z.array(z.object({ rank: z.string().min(1).max(30), minGroupBV: z.number().min(0), bonus: z.number().min(0) })).min(1).max(10),
  wholesaleDefaultDiscountPct: z.number().min(0).max(80),
  wholesaleDefaultMinQty: z.number().int().min(1).max(1000),
  minWithdrawal: z.number().min(0),
  loyaltyRsPerPoint: z.number().min(1),
  pointValueRs: z.number().min(0),
  minRedeemPoints: z.number().int().min(0),
  rsPerBV: z.number().min(1),
  couponsForMembers: z.boolean(),
});

members.get('/admin/settings', adminOnly, async () => json({ success: true, message: 'Member settings', data: await getMemberSettings() }));

members.put('/admin/settings', adminOnly, validate(settingsSchema), async ({ body }) => {
  const s = await getSettings();
  s.members = { ...MEMBER_DEFAULTS, ...body };
  await db.settings.save(s);
  return json({ success: true, message: 'Member settings saved', data: await getMemberSettings() });
});

/** Month-end: store this month's points per member and start the new month from zero. */
members.post('/admin/close-month', adminOnly, async ({ user: admin }) => {
  const s = await getSettings();
  const period = new Date().toISOString().slice(0, 7);
  if (s.lastClosedPeriod === period) throw new BadRequestError(`${period} is already closed`);
  const sql = getSql();
  const rows = await sql`
    update users set data = data
        || jsonb_build_object('lastMonthBV', coalesce((data->>'monthlyBV')::numeric, 0), 'monthlyBV', 0)
        || jsonb_build_object('bvHistory', coalesce(data->'bvHistory', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('period', ${period}::text, 'bv', coalesce((data->>'monthlyBV')::numeric, 0)))),
      updated_at = now()
    where coalesce((data->>'monthlyBV')::numeric, 0) <> 0 or data#>>'{partner,status}' = 'approved'
    returning _id`;
  s.lastClosedPeriod = period;
  s.monthCloses = [...(s.monthCloses ?? []), { period, closedAt: new Date().toISOString(), by: admin!._id, members: rows.length }].slice(-36);
  await db.settings.save(s);
  return json({ success: true, message: `Closed ${period} for ${rows.length} members`, data: { period, members: rows.length } });
});

// Generic review route last, so the fixed /admin/... paths above match first
const decisionSchema = z.object({ action: z.enum(['approve', 'reject', 'suspend', 'reinstate']), note: z.string().max(300).optional() });

members.post('/admin/:userId/:kind', adminOnly, validate(decisionSchema), async ({ params, body, user: admin }) => {
  if (!['partner', 'business', 'kyc'].includes(params.kind)) throw new NotFoundError('Route');
  const kind = params.kind as 'partner' | 'business' | 'kyc';
  const u = await db.users.findById(params.userId);
  if (!u) throw new NotFoundError('User');
  const rec = u[kind];
  if (!rec) throw new BadRequestError('Nothing to review for this user');
  const now = new Date().toISOString();
  const { action, note } = body;
  const statusFor = { approve: 'approved', reject: 'rejected', suspend: 'suspended', reinstate: 'approved' } as const;
  if (kind === 'kyc' && (action === 'suspend' || action === 'reinstate')) throw new BadRequestError('Use approve or reject for payout details');

  rec.status = statusFor[action as keyof typeof statusFor];
  rec.reviewedAt = now;
  rec.reviewedBy = admin!._id;
  if (note) rec.note = note;
  if (action === 'approve') rec.approvedAt = rec.approvedAt ?? now;
  if (kind === 'partner' && rec.status === 'approved' && !u.memberCode) u.memberCode = await uniqueMemberCode();
  if (kind === 'business' && rec.status === 'approved' && !u.memberCode) u.memberCode = await uniqueMemberCode();
  u[kind] = rec;
  await db.users.save(u);

  const label = kind === 'partner' ? 'Brand Partner' : kind === 'business' ? 'wholesale account' : 'payout details';
  const messages: Record<string, string> = {
    approved: kind === 'kyc' ? 'Your payout details are verified. You can now withdraw your earnings.' : `Your ${label} is active. Welcome to Azeeora!${u.memberCode ? ` Your member code is ${u.memberCode}.` : ''}`,
    rejected: `Your ${label} application was not approved.${note ? ` ${note}` : ''}`,
    suspended: `Your ${label} has been suspended.${note ? ` ${note}` : ''}`,
  };
  await createNotification({
    userId: u._id,
    type: 'general',
    title: kind === 'kyc' ? 'Payout details' : label[0].toUpperCase() + label.slice(1),
    message: messages[rec.status],
    link: kind === 'business' ? '/account/business' : '/account/partner',
  });
  if (u.email && ['approved', 'rejected', 'suspended'].includes(rec.status)) {
    void sendMembershipStatusEmail(u.email, u.firstName, kind, rec.status as 'approved' | 'rejected' | 'suspended', u.memberCode, note);
  }
  return json({ success: true, message: `Updated`, data: adminUser(u) });
});

