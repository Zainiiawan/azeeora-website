import { NextRequest, NextResponse } from 'next/server';

/**
 * Auto month-close cron endpoint.
 * Call on the 1st of every month. Secured via CRON_SECRET.
 *
 * Vercel cron.json example:
 *   { "crons": [{ "path": "/api/cron/close-month", "schedule": "0 0 1 * *" }] }
 *
 * curl -X POST https://yoursite.com/api/cron/close-month \
 *      -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get('authorization') ?? req.headers.get('x-cron-secret') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  if (secret && token !== secret) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { db, getSql } = await import('@/server/db');
    const { getSettings } = await import('@/server/commerce');

    const s = await getSettings();
    const period = new Date().toISOString().slice(0, 7);
    if (s.lastClosedPeriod === period) {
      return NextResponse.json({ success: false, message: `Period ${period} already closed` }, { status: 409 });
    }

    const sql = getSql();
    const rows = await sql`
      update users set data = data
          || jsonb_build_object('lastMonthBV', coalesce((data->>'monthlyBV')::numeric, 0), 'monthlyBV', 0)
          || jsonb_build_object('bvHistory', coalesce(data->'bvHistory', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('period', ${period}::text, 'bv', coalesce((data->>'monthlyBV')::numeric, 0)))),
        updated_at = now()
      where coalesce((data->>'monthlyBV')::numeric, 0) <> 0 or data#>>'{partner,status}' = 'approved'
      returning _id`;

    s.lastClosedPeriod = period;
    s.monthCloses = [...(s.monthCloses ?? []), { period, closedAt: new Date().toISOString(), by: 'cron', members: rows.length }].slice(-36);
    await db.settings.save(s);
    console.log(`[Cron] Month closed: ${period} — ${rows.length} members`);
    return NextResponse.json({ success: true, message: `Closed ${period} for ${rows.length} members`, data: { period, members: rows.length } });
  } catch (err: any) {
    console.error('[Cron] close-month failed:', err);
    return NextResponse.json({ success: false, message: err?.message ?? 'Internal error' }, { status: 500 });
  }
}

export { POST as GET };
