/* Minimal structured logger for serverless (Vercel captures stdout/stderr). */
const fmt = (level: string, msg: string, meta?: unknown) =>
  `[${new Date().toISOString()}] ${level.toUpperCase()} ${msg}${meta ? ` ${JSON.stringify(meta)}` : ''}`;

export const logger = {
  info: (msg: string, meta?: unknown) => console.log(fmt('info', msg, meta)),
  warn: (msg: string, meta?: unknown) => console.warn(fmt('warn', msg, meta)),
  error: (msg: string, meta?: unknown) =>
    console.error(fmt('error', msg, meta instanceof Error ? { message: meta.message } : meta)),
};
