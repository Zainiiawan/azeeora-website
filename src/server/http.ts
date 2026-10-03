import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { db, Doc } from './db';
import { verifyAccessToken } from './jwt';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Errors (same messages and status codes as the old Express API)
// ---------------------------------------------------------------------------
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly errors?: Array<{ field: string; message: string }>
  ) {
    super(message);
  }
}
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403);
  }
}
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

// ---------------------------------------------------------------------------
// Request context
// ---------------------------------------------------------------------------
export type AuthUser = Doc & {
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'admin';
  isEmailVerified: boolean;
  isActive: boolean;
};

export interface Ctx {
  req: NextRequest;
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  user?: AuthUser;
  ip: string;
}

export type Handler = (ctx: Ctx) => Promise<NextResponse | Response> | NextResponse | Response;
export type Middleware = (ctx: Ctx) => Promise<void> | void;

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

const SENSITIVE_USER_FIELDS = [
  'password',
  'refreshTokens',
  'emailVerificationToken',
  'emailVerificationExpiry',
  'otpCode',
  'otpExpiry',
  'otpAttempts',
  'otpLastSent',
  'passwordResetToken',
  'passwordResetExpiry',
];

/** Same as the old User model's toJSON transform. */
export function publicUser<T extends Doc | null | undefined>(user: T): T {
  if (!user) return user;
  const copy: Doc = { ...user };
  for (const key of SENSITIVE_USER_FIELDS) delete copy[key];
  return copy as T;
}

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------
export async function resolveUser(ctx: Ctx): Promise<AuthUser | undefined> {
  const header = ctx.req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return undefined;
  try {
    const payload = verifyAccessToken(match[1]);
    if (payload.type && payload.type !== 'access') return undefined;
    const user = await db.users.findById(payload.sub);
    if (!user || user.isActive === false) return undefined;
    return publicUser(user) as AuthUser;
  } catch {
    return undefined;
  }
}

export const authenticate: Middleware = async (ctx) => {
  const user = await resolveUser(ctx);
  if (!user) throw new UnauthorizedError('Authentication required. Please log in.');
  ctx.user = user;
};

export const optionalAuthenticate: Middleware = async (ctx) => {
  const user = await resolveUser(ctx);
  if (user) ctx.user = user;
};

export const authorize =
  (...roles: Array<'admin' | 'customer'>): Middleware =>
  (ctx) => {
    if (!ctx.user) throw new UnauthorizedError('Authentication required.');
    if (!roles.includes(ctx.user.role)) {
      throw new ForbiddenError('You do not have permission to perform this action.');
    }
  };

export const adminOnly: Middleware[] = [authenticate, authorize('admin')];

export const requireEmailVerification: Middleware = (ctx) => {
  if (!ctx.user?.isEmailVerified) {
    throw new ForbiddenError('Please verify your email address to continue.');
  }
};

/** Validate and coerce `ctx.body` or `ctx.query` (like the old `validate()` middleware). */
export const validate =
  (schema: ZodSchema, target: 'body' | 'query' = 'body'): Middleware =>
  (ctx) => {
    const result = schema.safeParse(ctx[target]);
    if (!result.success) {
      throw new AppError(
        'Validation failed',
        422,
        result.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }))
      );
    }
    ctx[target] = result.data;
  };

// ---------------------------------------------------------------------------
// Rate limiting (per serverless instance, best effort)
// ---------------------------------------------------------------------------
const buckets = new Map<string, { count: number; resetAt: number }>();

export const rateLimit =
  (name: string, windowMs: number, max: number, message: string): Middleware =>
  (ctx) => {
    const key = `${name}:${ctx.ip}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    bucket.count += 1;
    if (bucket.count > max) throw new AppError(message, 429);
  };

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
type Route = {
  method: string;
  parts: string[];
  middleware: Middleware[];
  handler: Handler;
};

export class Router {
  private routes: Route[] = [];

  private add(method: string, path: string, stack: Array<Middleware | Middleware[] | Handler>) {
    const handler = stack[stack.length - 1] as Handler;
    const middleware = (stack.slice(0, -1) as Array<Middleware | Middleware[]>).flat();
    this.routes.push({ method, parts: path.split('/').filter(Boolean), middleware, handler });
  }

  get(path: string, ...stack: Array<Middleware | Middleware[] | Handler>) {
    this.add('GET', path, stack);
  }
  post(path: string, ...stack: Array<Middleware | Middleware[] | Handler>) {
    this.add('POST', path, stack);
  }
  put(path: string, ...stack: Array<Middleware | Middleware[] | Handler>) {
    this.add('PUT', path, stack);
  }
  patch(path: string, ...stack: Array<Middleware | Middleware[] | Handler>) {
    this.add('PATCH', path, stack);
  }
  delete(path: string, ...stack: Array<Middleware | Middleware[] | Handler>) {
    this.add('DELETE', path, stack);
  }

  /** Mount another router under a prefix, e.g. `/products`. */
  use(prefix: string, child: Router) {
    const pre = prefix.split('/').filter(Boolean);
    for (const r of child.routes) this.routes.push({ ...r, parts: [...pre, ...r.parts] });
  }

  match(method: string, segments: string[]) {
    // First match wins, in registration order, exactly like Express
    for (const route of this.routes) {
      if (route.method !== method || route.parts.length !== segments.length) continue;
      const params: Record<string, string> = {};
      let ok = true;
      for (let i = 0; i < route.parts.length; i++) {
        const p = route.parts[i];
        if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(segments[i]);
        else if (p !== segments[i]) {
          ok = false;
          break;
        }
      }
      if (ok) return { route, params };
    }
    return null;
  }

  async handle(req: NextRequest, segments: string[]): Promise<Response> {
    try {
      const found = this.match(req.method, segments);
      if (!found) {
        return json({ success: false, message: `Route ${req.method} /api/${segments.join('/')} not found` }, 404);
      }

      const query = Object.fromEntries(req.nextUrl.searchParams.entries());
      let body: any = {};
      const contentType = req.headers.get('content-type') || '';
      if (req.method !== 'GET' && req.method !== 'HEAD' && contentType.includes('application/json')) {
        const text = await req.text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            throw new BadRequestError('Invalid JSON body');
          }
        }
      }

      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
      const ctx: Ctx = { req, params: found.params, query, body, ip };

      for (const mw of found.route.middleware) await mw(ctx);
      return await found.route.handler(ctx);
    } catch (err) {
      return errorResponse(err);
    }
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error(err.message);
    return json(
      { success: false, message: err.message, ...(err.errors && { errors: err.errors }) },
      err.statusCode
    );
  }
  if (err instanceof ZodError) {
    return json(
      {
        success: false,
        message: 'Validation failed',
        errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      },
      422
    );
  }
  const e = err as { code?: string; constraint_name?: string; name?: string; message?: string };
  // Postgres unique violation (was Mongo duplicate key 11000)
  if (e?.code === '23505') {
    const field = (e.constraint_name || 'field').replace(/^[a-z_]+?_(.+?)_key$/, '$1');
    return json({ success: false, message: `A record with this ${field} already exists` }, 409);
  }
  if (e?.name === 'JsonWebTokenError') {
    return json({ success: false, message: 'Invalid token. Please log in again.' }, 401);
  }
  if (e?.name === 'TokenExpiredError') {
    return json({ success: false, message: 'Your session has expired. Please log in again.' }, 401);
  }
  logger.error(e?.message || String(err));
  return json(
    {
      success: false,
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Please try again later.'
          : e?.message || 'Unknown error',
    },
    500
  );
}
