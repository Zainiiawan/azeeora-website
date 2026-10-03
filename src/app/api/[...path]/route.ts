import { NextRequest } from 'next/server';
import { api } from '@/server/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ path: string[] }> };

const handle = async (req: NextRequest, { params }: Params) => api.handle(req, (await params).path ?? []);

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
