import { getSql } from '@/server/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  let database = 'disconnected';
  try {
    await getSql()`select 1`;
    database = 'connected';
  } catch {
    // reported below
  }
  return Response.json({ status: 'ok', database, timestamp: new Date().toISOString() });
}
