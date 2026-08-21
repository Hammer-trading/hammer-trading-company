# 💸 FREE Action Plan — Hammer Trading Company
**Date:** 21 August 2026 · **Rule:** Ek bhi paisa nahi — sirf free tiers + open source

> Phase 0 (build fix + cleanup) already free me ho chuka hai ✅.
> Ye plan unhi cheezo par focus karta hai jo **₹0 / $0** me ho sakti hain.

---

## 1️⃣ Free Stack (Jo aaj se free use kar sakte ho)

| Kaam | Free Tool | Free Limit |
|---|---|---|
| Hosting | **Vercel Hobby** | 100GB bandwidth/mo, serverless, cron |
| Database | **Neon Postgres** (managed) | 0.5GB storage, auto-suspend |
| CI/CD | **GitHub Actions** | Public repo: unlimited; private: 2000 min/mo |
| Tests | **Vitest + Playwright** | Open source, unlimited |
| Email/OTP | **Gmail app password** ya **Resend/Brevo** | 100–500 emails/day free |
| WhatsApp | **Meta WhatsApp Cloud API** | 1000 free service conversations/mo (verify) |
| Rate limiting | **Upstash Redis / Vercel KV** | 10k commands/day free |
| Error tracking | **Sentry** | 5k errors/mo free |
| Uptime check | **UptimeRobot** | 50 monitors, 5-min interval free |
| Fonts/Perf | **next/font + PWA (Serwist)** | Open source, free |
| Security | CSP headers, npm audit, husky | Open source, free |

**Total monthly cost: ₹0** ✅

---

## 2️⃣ Phase-wise Free Plan

### 🔴 Phase 1 — CI/CD (FREE, sabse important)
- **GitHub Actions** workflow: push/PR par `npm ci → prisma generate → lint → tsc → build`
- Bonus: `npm audit` gate + Postgres service for tests
- **Cost:** ₹0 · **Time:** 2-3 hrs · **Mai abhi kar sakta hoon**

### 🔴 Phase 2 — Automated Tests (FREE)
- **Vitest + supertest**: auth, checkout, chat-isolation, admin CRUD
- **Playwright**: 3 journeys (customer buy, admin manage, delivery confirm)
- **Cost:** ₹0 · **Time:** ~1 week

### 🟠 Phase 3 — OTP/Notifications (FREE version)
**Paid SMS chhodo abhi. Free alternatives (same flow, `lib/integrations.ts` me adapter):**

1. **Email OTP (primary)** — Gmail app password se SMTP. Free, 500/day.
   - Checkout par OTP email; admin "Resend" button (rate-limited)
2. **WhatsApp OTP (bonus)** — Meta Cloud API, low volume par near-free
3. **SMS sirf tab** jab orders zyada hon aur revenue aaye

**Payment:** COD already built hai — **wohi free option hai** ✅. Online gateway (JazzCash etc.) me transaction fee lagti hai, isliye tab tak delay karo jab tak zaroorat ho.

### 🟠 Phase 4 — Security (FREE)
- Redis rate limit → **Upstash/Vercel KV** free tier
- CSP headers, HSTS → `next.config.mjs`
- `npm audit` CI gate
- Prisma 6 upgrade (free)

### 🟡 Phase 5 — Performance (FREE)
- `npm uninstall @theatre/core @react-three/rapier @dimforge/rapier3d-compat react-to-print motion` (~1 hr, maine verify kiya — koi use nahi karta)
- `next/font` (render-blocking CSS imports hatana)
- Service worker → **Serwist** (free, maintained)

### 🟡 Phase 6 — Deploy + Monitoring (FREE)
- **Vercel Hobby + Neon** — dono free, 5-min me setup
- **Sentry** free tier + **UptimeRobot** (50 checks)
- `publish-build/` hatao, ek platform (Vercel) pe focus

---

## 3️⃣ Sirf ye cheezein kabhi free nahi hongi (baad me, jab revenue aaye)

| Cheez | Kyo | Kab |
|---|---|---|
| SMS OTP provider | Har SMS ka rate hota hai | Jab email/WhatsApp na chale |
| Payment gateway | Per-transaction fee (JazzCash ~1.5-2.5%) | Jab online payment chahiye |
| Courier API | Per-shipment fee | Jab volume ho (abhi manual hai — free) |

In teeno ke bina bhi store **poora functional hai**: COD orders, QR/OTP via email/WhatsApp, manual courier assignment — sab kaam karega.

---

## 4️⃣ Abhi free me kya start karun? (Aap batao)

| Option | Kya milega |
|---|---|
| **A. CI setup** | GitHub Actions — build kabhi na tootega (recommended) |
| **B. Tests** | Vitest + Playwright — first 2-3 test files |
| **C. Sab free improvements** | CI + deps cleanup + fonts + security headers — ek baar me |
| **D. OTP via Email/WhatsApp** | `lib/integrations.ts` me free provider adapter |

Har option: lint + build green, commit + push, deploy-ready. **Bas ek option chuno.** 👇
