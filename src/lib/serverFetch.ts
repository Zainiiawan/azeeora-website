import { NextRequest } from 'next/server';
import { api } from '@/server/api';

/**
 * Call the built-in API from server components without an HTTP round trip.
 * Returns a standard Response, so it is a drop-in for `fetch(`${apiUrl}/...`)`.
 * Page-level `revalidate` still controls caching.
 */
export async function serverFetch(path: string, _init?: unknown): Promise<Response> {
  const url = new URL(path.replace(/^\/+/, ''), 'http://internal/api/');
  const segments = url.pathname.replace(/^\/api\//, '').split('/').filter(Boolean);
  return api.handle(new NextRequest(url), segments);
}
