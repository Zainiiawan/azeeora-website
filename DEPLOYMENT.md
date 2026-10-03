# Azeeora Cosmetics: one app, one deploy

The storefront, admin panel and API now live in this single Next.js app.
The old Express server (`ayezacosmetics-backend`, hosted on Render) is no
longer needed once this is live.

```
src/app/            pages (storefront + /admin)
src/app/api/        every /api/* endpoint (catch-all route -> src/server/api.ts)
src/server/         API code: routes, auth, emails, Postgres access
supabase/migrations SQL schema for the Supabase database
scripts/            one-off MongoDB -> Supabase data copy
```

## Database (Supabase, project `azeeora-cosmetics`, Telgates org)

The schema in `supabase/migrations/0001_init.sql` is already applied.
Each old Mongo collection is a table with the original `_id`, the full
document in `data` (jsonb) and indexed columns for the fields the API
filters on. Uniqueness is enforced in the database:

| table | unique on |
|---|---|
| users | email |
| products | slug, sku |
| categories / subcategories / brands | slug |
| orders | order_number |
| coupons | code |
| carts | user |
| shipping_rates | city (case-insensitive) |
| reviews | one per customer (or guest email) per product |

Row Level Security is on with no policies, so the public Supabase keys can
read nothing. Only the server (via `DATABASE_URL`) can access data.

## Going live (Telgates Vercel team)

1. **Database login.** `supabase/migrations/0002_app_role.sql` (already applied)
   created the `azeeora_app` role with access to the store tables only. Give
   it a password at deploy time, then use it in `DATABASE_URL`:
   ```sql
   alter role azeeora_app login password '<long random string>';
   ```
   `DATABASE_URL=postgresql://azeeora_app.vggdwnmovgtzkuciqiro:<password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`
   (if the health check says disconnected, try host `aws-1-ap-south-1`).
2. **Vercel project** in the Telgates team from `Zainiiawan/ayezacosmetics-frontend`,
   with **production branch `claude/unified-luxury-redesign`**.
   Do not merge into `main` yet: the current live site (old Vercel account)
   builds from `main` and would break without these variables.
3. **Variables:** `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
   `NEXT_PUBLIC_API_URL=/api`, plus Cloudinary and email keys when available.
4. Check `https://<project>.vercel.app/api/health` says `"database":"connected"`.
5. **Domain:** add it to the new project, point DNS at Vercel, set
   `NEXT_PUBLIC_APP_URL`, then merge the branch into `main`.

## Environment variables (Vercel → Project → Settings → Environment Variables)

| name | value |
|---|---|
| `DATABASE_URL` | Supabase → Connect → **Transaction pooler** URI (port 6543), with the database password |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | long random strings (reuse the Render values to keep people signed in) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | same as on Render |
| `RESEND_API_KEY`, `RESEND_FROM` | same as on Render (or `EMAIL_USER` / `EMAIL_PASSWORD` for Gmail SMTP) |
| `ADMIN_EMAIL` | where new-order and contact emails go |
| `CLIENT_URL` | `https://ayezacosmetics.store` (used in email links) |
| `NEXT_PUBLIC_APP_URL` | `https://ayezacosmetics.store` |
| `NEXT_PUBLIC_API_URL` | `/api` (already set in `.env.production`) |

## Moving the data from MongoDB

**Done on 3 Oct 2026.** All live data from the `ayezacosmetics` Atlas project
(Cluster0, database `ayezacosmetics`) is in Supabase: 1 user, 2 categories,
2 products, 4 reviews, 4 notifications, 1 settings record and 6 shipping
rates, verified record by record. Orders, carts, coupons, brands and
subcategories were empty in MongoDB. Re-run the script below only if new
data lands in MongoDB before the switch-over (it upserts, so it is safe).

Run once from any machine that can reach both databases:

```bash
npm install
MONGODB_URI="mongodb+srv://…/ayezacosmetics" \
DATABASE_URL="postgresql://…supabase…:6543/postgres" \
node scripts/migrate-mongo-to-supabase.mjs --dry-run   # counts only

MONGODB_URI=… DATABASE_URL=… node scripts/migrate-mongo-to-supabase.mjs
```

It copies users (with their password hashes, so everyone can still log in),
products, categories, orders, reviews, coupons, carts, notifications,
settings and shipping rates. It keeps every original id, is safe to re-run
(upserts), and finishes with a Mongo vs Postgres count per collection.

## Local development

```bash
cp .env.production .env.local        # then add DATABASE_URL and JWT secrets
npm run dev                          # http://localhost:3000, API at /api
```

Any Postgres works locally: apply `supabase/migrations/0001_init.sql` to it.

## Notes

- Uploads go straight to Cloudinary. Vercel caps request bodies at about
  4.5 MB, so very large product videos should be uploaded in the
  Cloudinary console and pasted in, rather than through the admin form.
- Rate limits (login, reviews, uploads) are per server instance.
- Google sign-in was configured on the old server but the storefront never
  used it, so it was not carried over.
