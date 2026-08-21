# 🎯 Hammer Trading Company — Complete Action Plan
**Date:** 21 August 2026 · **Status:** Phase 0 complete ✅

> Ye plan repo ke asli files/architecture ke hisaab se banaya gaya hai. Har phase me:
> **Kya karna hai → Kaise (files) → Acceptance criteria → Time estimate**

---

## 📊 Plan Overview

| Phase | Focus | Priority | Status |
|---|---|---|---|
| 0 | Build fix + repo hygiene | 🔴 Critical | ✅ DONE (commit `9258bc3`) |
| 1 | CI/CD + quality gates | 🔴 Critical | ⬜ Next |
| 2 | Automated testing | 🔴 Critical | ⬜ |
| 3 | Real integrations (SMS/SMTP/Payment) | 🟠 High | ⬜ |
| 4 | Security hardening | 🟠 High | ⬜ |
| 5 | Performance + deps cleanup | 🟡 Medium | ⬜ |
| 6 | Deployment + monitoring | 🟡 Medium | ⬜ |
| 7 | Growth features (backlog) | 🟢 Later | ⬜ |

---

## ✅ Phase 0 — Foundation (COMPLETED)
- Broken import fix (`admin-theme-designer.tsx`)
- Dead code removal (github-* cluster, 4 files)
- 21 lint issues fixed → `eslint` = 0/0
- ~24MB junk + session cookies removed from git
- `.gitignore` rewritten

---

## 🔴 Phase 1 — CI/CD + Quality Gates (SABSE IMPORTANT)
**Kyun:** Broken build isliye main branch me pahuncha kyunki koi check nahi tha. Ye dobara hone se rokta hai.

### 1.1 GitHub Actions workflow
**File:** `.github/workflows/ci.yml` (naya)
```yaml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_DB: hammer_trading, POSTGRES_USER: postgres, POSTGRES_PASSWORD: postgres }
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npx prisma generate
      - run: npx prisma migrate deploy     # real migrations verify hoti hain
      - run: npm run lint                  # --max-warnings=0
      - run: npx tsc --noEmit
      - run: npm run build                 # production build gate
      - run: npx prisma db seed
      - run: npm run test:order-stock      # existing smoke test
```
**Acceptance:** Har PR par ye sab green ho; broken code merge hona impossible.

### 1.2 Git hooks (optional but recommended)
- `husky` + `lint-staged`: commit se pehle sirf changed files par eslint.
- **Effort:** CI ~2-3 hrs, hooks ~1 hr.

---

## 🔴 Phase 2 — Automated Testing
**Kyun:** 111 API routes, 62 pages, **0 unit/integration tests**. Sirf manual `scripts/test-*.mjs` hain jo local server chahiye.

### 2.1 API integration tests — Vitest + supertest
- **Files:** `tests/api/` (naya folder) + `vitest.config.ts`
- Priority order (jo pahle se scripted hain, unhe proper tests me convert karo):
  1. **Auth:** login, session revocation, RBAC denial (`tests/api/auth.test.ts`)
  2. **Checkout:** valid/invalid variant, stock deduction, coupon, guest rules
  3. **Chat isolation:** 2 customers ka data alag rahe (script pehle se hai)
  4. **Admin CRUD:** products, orders, platform resources
- Test DB: CI me Postgres service (Phase 1.1 me already hai) — `DATABASE_URL` point karo.

### 2.2 E2E — Playwright (3 critical journeys)
1. Customer: browse → add to cart → checkout → track order
2. Admin: login → create product → view order
3. Delivery: QR/OTP confirmation flow (mock SMS)
- **Effort:** ~1 week part-time. **Acceptance:** `npm test` CI me green.

---

## 🟠 Phase 3 — Real Integrations (PRODUCT KA SABSE BADA GAP)
**Kyun:** Unke apne `CONNECTION_AUDIT` kehta hai — SMS OTP **TODO hai**, isliye QR+OTP delivery confirmation real customer ke liye **kabhi complete nahi ho sakta**.

### 3.1 SMS OTP delivery (🔴 pehle ye)
- **Files:** `lib/integrations.ts` (sendSms TODO), `app/api/checkout/route.ts`, `app/api/confirm-delivery/route.ts`
- Provider options: **Twilio** (global), **Fast2SMS / MSG91 / Infobip** (Pakistan-friendly check karo — Twilio PK me kaam karta hai)
- Features:
  - OTP send → `OutboundNotificationJob` me log (model already hai!)
  - Retry (max 3) + admin "Resend OTP" button (rate-limited)
  - Store provider message ID + delivery state in `OutboundNotificationAttempt` (model already hai — schema ready hai, sirf code missing)
- **Acceptance:** Customer ko real OTP SMS aaye; delivery confirm ho sake.

### 3.2 SMTP email (🟠 doosra)
- SMTP adapter already implemented hai (`lib/integrations.ts` me real SMTP code hai!)
- Bas credentials chahiye: SMTP_HOST/USER/PASSWORD. Use: order confirmation, OTP fallback, password reset, admin notifications.

### 3.3 Payment gateway (🟠 teesra)
- Abhi sirf COD + bank transfer placeholder. Options PK: **JazzCash / EasyPaisa / Stripe** (Stripe PK me supported hai via cards, local methods limited)
- `PAYMENT_API_URL/KEY` env vars already defined — adapter banao.
- **Important:** Checkout `payment_methods` setting me gateway add karna + webhook route (`/api/payment/webhook`) + order status auto-update.

### 3.4 Courier + WhatsApp (🟡 baad me)
- Courier: Trax/TCS/LCS APIs — booking + tracking webhook.
- WhatsApp Business API adapter partially hai (`lib/integrations.ts` me Meta code) — bas credentials + template approval.

**Effort:** SMS 1-2 days, SMTP 2-4 hrs (credentials ke saath), Payment 3-5 days, Courier 3-5 days.

---

## 🟠 Phase 4 — Security Hardening
| Item | Kya | Files |
|---|---|---|
| Redis rate limit | In-memory `Map` → serverless par effective nahi; Upstash Redis use karo | `lib/security.ts` |
| CSRF tokens | Double-submit token (defense-in-depth) | `middleware.ts`, `lib/security.ts` |
| Session rotation | Har login/sensitive action par token rotate | `lib/auth.ts` |
| Security headers | CSP add karo (inline scripts ke liye hashes), HSTS | `next.config.mjs` |
| Dependency audit | `npm audit` CI me gate banao | `.github/workflows/ci.yml` |
| Prisma 6 | Upgrade consider (better engine, `--no-engine` for Vercel) | `package.json` |

**Effort:** 2-3 days.

---

## 🟡 Phase 5 — Performance + Deps Cleanup
### 5.1 Unused dependencies remove (quick win, ~1 hr)
```bash
npm uninstall @theatre/core @react-three/rapier @dimforge/rapier3d-compat react-to-print motion
```
(Verify: `grep -rn "from '..." app components lib` — maine check kiya, kahin use nahi hote. `framer-motion` hi animation lib hai.)

### 5.2 Fonts — `next/font` (`app/layout.tsx`, `app/globals.css`)
- Abhi CSS `@import` render-blocking hai. `next/font` = self-host + preload + no CLS.

### 5.3 Service worker upgrade
- Manual `public/sw.js` → **@serwist/next** (maintained, automatic precache, updates).

### 5.4 Images
- `images/` folder root me hai — QA screenshots tha; ab git se hat gaya. Public images ko `next/image` + WebP me convert karo (galley/files).

**Effort:** ~2-3 days.

---

## 🟡 Phase 6 — Deployment + Monitoring
### 6.1 Platform decision (confusion hai abhi)
- `netlify.toml` + `vercel.json` + `publish-build/` teeno hain. **Choose Vercel** (wahan project already linked hai, `vercel.json` cron bhi hai).
- `publish-build/` git se hatao (CI generate karega).

### 6.2 Production setup checklist
- [ ] Vercel project: env vars set (JWT_SECRET 32+ chars, APP_URL, DATABASE_URL → **Neon** managed Postgres, GOOGLE OAuth, SMTP)
- [ ] `npx prisma migrate deploy` prod DB par
- [ ] Vercel Cron (`/api/cron/notifications`) — `CRON_SECRET` set
- [ ] Domain + HSTS

### 6.3 Monitoring (abhi zero hai)
- **Sentry** (Next.js SDK) — errors + performance
- **Better Stack / Logtail** — server logs
- Uptime check (cron 5 min) + alert on failure

**Effort:** 2-3 days + provider accounts.

---

## 🟢 Phase 7 — Growth Backlog (baad me)
- Abandoned cart recovery (email/SMS after 24h) — `Cart` model + notification job ready hai
- Loyalty/referral program
- Product reviews moderation queue (model already hai)
- WhatsApp quick-order deep links (partially hai)
- Multi-vendor mode (abhi single-admin hai — intentional)
- Mobile app (PWA wrapper ya React Native)

---

## 📅 Suggested Execution Order (2-3 weeks part-time)

| Week | Kaam |
|---|---|
| **Week 1** | Phase 1 (CI) + Phase 2 start (auth/checkout tests) |
| **Week 2** | Phase 3.1 SMS OTP + 3.2 SMTP (provider accounts lo) + Phase 5.1 deps |
| **Week 3** | Phase 3.3 Payment + Phase 4 security + Phase 6 deploy/monitor |

## 🔑 Aapko kya chahiye (external)
1. **SMS provider account** (Twilio ya local) — API key
2. **SMTP credentials** (ya Gmail app password)
3. **Payment gateway merchant account** (JazzCash/EasyPaisa/Stripe)
4. **Neon/Postgres** production DB (ya Docker wala upgrade)
5. GitHub repo par **Actions enabled**

---

## 🤝 Aage kaise chalna hai
- **Bolo "Phase 1 start karo"** → main CI workflow + husky setup kar dunga
- **Bolo "SMS connect karo"** → `lib/integrations.ts` me provider adapter likh dunga (aapka API key baad me daal dena)
- Har phase ke baad: build + lint + tests green, commit + push, aap deploy karke verify karo
