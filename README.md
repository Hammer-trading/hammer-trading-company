# Hammer Trading Company

Modern hardware e-commerce store built with Next.js, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Start PostgreSQL.

If Docker Desktop is installed, use the included local PostgreSQL container:

```bash
npm run db:up
```

If Docker is not installed, install PostgreSQL locally and create a database named `hammer_trading`. Keep `.env` using:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hammer_trading?schema=public"
```

4. Create the database schema and seed sample data:

```bash
npm run db:setup
```

`npm run db:setup` runs Prisma generate, applies the included migrations, and runs the seed script. The seed creates real development data for the admin dashboard: products, categories, brands, customers, staff, couriers, riders, delivery rules, coupons, banners, quote requests, reviews, support tickets, notifications, activity logs, inventory logs, and sample orders.

5. Run the app:

```bash
npm run dev
```

6. Production check:

```bash
npm run build
```

## Continuous Integration

GitHub Actions (`/.github/workflows/ci.yml`) runs on every push and pull request:

- **quality job:** `npm ci` → Prisma generate → `npm run lint` (zero warnings allowed) → `tsc --noEmit` → `next build` → `npm audit` (production deps, high+ fails)
- **database job:** fresh PostgreSQL 16 container → `prisma migrate deploy` (all migrations) → seed → order-stock unit test

A broken build can no longer be merged. Enable branch protection on `main` → "Require status checks" → `CI / Lint · Types · Build · Audit` and `CI / Migrations · Seed · Unit tests`.

## Netlify Deployment

This repo includes `netlify.toml` and `.nvmrc` so it can be imported directly into Netlify.

- Build command: `npm run build`
- Publish directory: `.next`
- Node version: `22`

Because this is a dynamic Next.js app with API routes, use a Git-based Netlify deploy rather than static drag-and-drop. See `NETLIFY_DEPLOY.md` for the environment variables and hosted PostgreSQL notes.

The primary admin account is configured from the environment:

- Email: `hammertrading2018@gmail.com` by default.
- Password: the value of `ADMIN_PASSWORD` during first-time setup only.

Run `npm run admin:configure` to safely assign the configured email to the existing primary admin without replacing its password. Sign in at `/login?next=/admin`. The admin button is intentionally hidden from public visitors and only appears for an authenticated admin session.

For disaster recovery only, set a strong `ADMIN_PASSWORD` and run `node scripts/rotate-primary-admin-password.mjs --confirm`. This revokes existing admin sessions. Normal password changes should be made from `/admin/account`.

The admin can update their profile, email, password, and active sessions from `/admin/account`. Password changes revoke all older sessions. Keep `ENABLE_DEV_ADMIN_FALLBACK=false`; passwordless admin access is disabled.

## Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string.
- `APP_URL`: Public app URL used for secure tokenized QR links.
- `JWT_SECRET`: Long random secret for signed auth and QR tokens.
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`: First-time primary admin configuration. Use a strong unique password and do not commit it.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth credentials. Add this callback URL in Google Cloud Console: `${APP_URL}/api/auth/google/callback`.
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_LOGIN_ATTEMPTS`: Sensitive action rate limits.
- `WHATSAPP_SUPPORT_NUMBER`: Customer support deep link number.
- `SMTP_*`, `SMS_API_KEY`, `COURIER_API_KEY`: Integration-ready provider settings.
- `BANK_TRANSFER_INSTRUCTIONS`: Payment placeholder shown during checkout.

## Storefront Coverage

The storefront includes database-first product listings with a guarded JSON fallback, dynamic homepage sections, product variants and image galleries, cart, package cart lines, checkout, order tracking, Google-login-ready authentication, WhatsApp quick order links, one-click COD Buy Now, bulk quote requests, SEO metadata, sitemap, robots.txt, and PWA support.

### 3D Experience (every device)

- **3D hero** renders on mobile, tablet and desktop with automatic quality tiers (WebGL support, memory, cores, touch, data-saver, reduced-motion are all respected; unsupported devices get the static poster fallback).
- **Product 3D model viewer** loads `.glb`/`.gltf` models with lazy loading, error boundary, battery-friendly `frameloop="demand"` on touch devices, desktop-only auto-rotate, and a "Drag to rotate" hint on touch.
- Admin can upload 3D models (max 20 MB) directly from `/admin/products` — the upload pipeline stores them in Vercel Blob and records them in the media library.
- Manage the complete spatial storefront interfaces (Foundry Cinema, Axonometric Workshop, Prism Gallery) at `/admin/store-3d` with live responsive preview.
- Two seeded products ship with demo CORS-friendly sample models so the viewer can be verified immediately; replace them with your own uploads.

Buy Now route:

```bash
/buy-now/bosch-impact-drill-650w
```

Bulk quote requests are submitted from product pages or the wholesale form and appear in `/admin/quotes`.

## Admin Coverage

The admin panel includes role-based protected routes, dashboard analytics, product/variant/category/brand/inventory management, orders and bulk printing, delivery, couriers, riders, QR/OTP confirmation, quotes, abandoned carts, customers, coupons, banners, reviews, support, reports, settings, notifications, and activity logs.

The Website Manager at `/admin/website` provides database-backed management for:

- Home services, service categories, products used by a service, and bookings.
- Room/product packages, categories, package items, prices, and stock-aware checkout.
- Completed projects, project categories, related products, and media.
- Media assets, navigation items, and homepage sections.

Public routes include `/services`, `/packages`, `/projects`, `/gallery`, and `/contact`.

## Customer And Admin Messages

Each logged-in customer has one private database-backed conversation with the store. Customers use `/account/messages`; admins use `/admin/messages`.

- Conversations remain isolated by the authenticated customer ID.
- Admin replies, customer replies, attachments, read status, unread counts, and timestamps persist in PostgreSQL.
- Admins can search, pin, archive, block, resolve, and add private internal notes.
- Message attachments accept JPG, PNG, WebP, or PDF files up to 700 KB.
- Logged-out customers and non-admin users cannot access protected message routes.

Critical writes validate input server-side, use Prisma parameterized queries, and record audit logs where staff actions change customer, coupon, banner, review, support, settings, order, delivery, product, or inventory data.

Delivery charges are controlled from admin/database delivery rules. Checkout calculates city, area, zone, weight, quantity, heavy/bulky item, free-delivery threshold, same-day, pickup, and manual override rules without hardcoded charges.

## Production Notes

- Keep `ENABLE_DEV_ADMIN_FALLBACK` disabled in production.
- Set real `JWT_SECRET`, `APP_URL`, Google OAuth credentials, WhatsApp/SMS/email provider credentials, and courier/payment credentials before deployment.
- Use a managed PostgreSQL database and run `npx prisma migrate deploy` against it. Do not run `db:reset` on production.
- Run `npm run prisma:generate`, `npm run test:order-stock`, `npm run lint`, and `npm run build` before deploying.
- Run `npm run test:smoke` while the production server is listening on port 3000.
- Run `npm run test:admin-auth` against a trusted local/staging server to verify the configured admin credentials, protected routes, and session revocation.
- Run `npm run test:chat-isolation` against a trusted local/staging server to verify two-customer isolation, admin replies, unread handling, persistence, and cleanup of temporary test records.

## Vercel Deployment

1. Add the environment variables from `.env.example` to the Vercel project, replacing all placeholder secrets and URLs.
2. Set `APP_URL` and `GOOGLE_CALLBACK_URL` to the production HTTPS domain.
3. Apply migrations with `npx prisma migrate deploy` using the production `DATABASE_URL`.
4. Deploy with `npx vercel --prod --yes`.
5. Verify public pages, protected redirects, admin account access, customer/admin messages, checkout, and Vercel runtime logs.

The production build command already runs Prisma Client generation before `next build`.

## External Integrations Still Required

The code includes clean service adapters with TODOs for real providers:

- Courier booking, rider assignment sync, and tracking webhooks.
- WhatsApp Business API templates.
- SMS OTP delivery provider.
- Email SMTP/transactional provider.
- Payment gateway or bank-transfer reconciliation API.

Until those credentials are added, the store records orders, timelines, delivery settings, QR/OTP confirmation flows, and notifications in an integration-ready format.
