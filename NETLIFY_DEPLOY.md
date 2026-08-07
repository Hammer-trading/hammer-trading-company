# Netlify Deploy

Use Git-based deploys for this project. It is a dynamic Next.js app with API routes, middleware, Prisma, and server rendering, so a simple static drag-and-drop upload is not enough.

## Netlify Settings

- Build command: `npm run build`
- Publish directory: `.next`
- Node version: `22`

Netlify's current Next.js support uses the OpenNext adapter automatically, so this repo does not pin `@netlify/plugin-nextjs`.

## Required Environment Variables

Set these in Netlify Project configuration > Environment variables:

- `DATABASE_URL`: Use a hosted PostgreSQL URL such as Neon, Supabase, Railway, or another external Postgres provider. Do not use `localhost`.
- `APP_URL`: Your Netlify site URL, for example `https://your-site-name.netlify.app`.
- `JWT_SECRET`: A long random secret.
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_LOGIN_ATTEMPTS`
- `ENABLE_DEV_ADMIN_FALLBACK`: Set to `false` for production.
- `WHATSAPP_SUPPORT_NUMBER`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMS_API_KEY`
- `COURIER_API_KEY`
- `BANK_TRANSFER_INSTRUCTIONS`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`: `https://your-site-name.netlify.app/api/auth/google/callback`

## Database

After connecting a hosted Postgres database, run the Prisma migration and seed once from a trusted machine:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

For future deploys, Netlify only needs `npm run build`.
