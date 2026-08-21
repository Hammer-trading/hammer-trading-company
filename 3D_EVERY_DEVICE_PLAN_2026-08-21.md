# 📱 3D Every Device — Plan (3D Designer har device par properly kaam kare)
**Date:** 21 August 2026 · **Cost:** ₹0 · **Target:** Mobile, Tablet, Desktop, Low-end phones — sab par smooth 3D

---

## 1. Abhi kya problem hai (verified code se)

| Device | Hero 3D | Product 3D | Spatial Home |
|---|---|---|---|
| **Desktop** | ✅ chalta hai | ⚠️ viewer hai, model nahi | ✅ |
| **Tablet** | ❌ band (pointer:fine + 1024px fail) | ⚠️ same | ✅ |
| **Mobile** | ❌ band (same guards) | ⚠️ same | ✅ (CSS hai) |
| **Low-end phone** | ❌ band | ⚠️ same | ✅ |

**Kyun band hai — `components/hero.tsx` line 53:**
```js
const query = window.matchMedia("(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
const hasEnoughMemory = (deviceMemory ?? 8) >= 4;
const hasEnoughCores = (hardwareConcurrency ?? 8) >= 4;
```
Ye guards **sabhi touch devices ko block** karte hain — chahe phone flagship ho ya iPad Pro. 3D scene khud **lightweight hai** (5-20 meshes, shadows off, dpr ≤1.5) — modern phones ye aaram se chala sakte hain.

**Product viewer (`product-model-viewer.tsx`):** mobile par technically chalta hai (touch rotate via OrbitControls) lekin:
- `frameloop` hamesha render karta hai → **battery drain**
- `autoRotate` hamesha on → mobile par annoying
- Koi quality tier nahi — low-end phone par bhi full DPR
- Models hain hi nahi (upload pipeline nahi)

---

## 2. Strategy — "Progressive 3D" (har device ke liye sahi level)

### Naya: Device Tier System (`components/use-device-tier.ts`)
Har device ko 4 tiers me baanto — phir har 3D component apne tier ke hisaab se render kare:

| Tier | Device | 3D Level |
|---|---|---|
| **high** | Desktop (mouse + 4GB+ + 4 cores+) | Full 3D: dpr 2, shadows, auto-rotate, all elements |
| **medium** | Flagship phone / tablet (touch + 4GB+) | 3D: dpr 1, no shadows, touch rotate, lighter scene |
| **low** | Budget phone (2GB RAM / weak) | Mini 3D: dpr 0.75, minimal elements, no auto-rotate |
| **none** | No WebGL / reduced-motion / data-saver | Static poster/image + CSS depth (current fallback) |

Detection (sab browser APIs, free):
```js
WebGL support → canvas.getContext("webgl2") || getContext("webgl")
deviceMemory, hardwareConcurrency, screen.width/height, touch, saveData, reduced-motion
```

---

## 3. Implementation — 5 fixes

### Fix A: Hero 3D mobile par chale (core requirement) 🎯
**Files:** `components/hero.tsx`, `components/storefront/three-hero-stage.tsx`
- Guards badlo: `pointer:fine` **hatao** (touch bhi 3D dekh sake)
- Tier system se render decision: medium/low bhi 3D chale (quality alag)
- `three-hero-stage.tsx` me quality props add karo:
  - **medium**: `dpr={[1,1]}`, Fasteners/extra meshes skip, `frameloop="demand"` (battery)
  - **low**: sirf 1 assembly + Grid, dpr 0.75
  - **high**: jo abhi hai (aur dpr 2 tak)
- Touch interaction pehle se kaam karta hai (pointer events) — bas canvas par `touch-action: none` + `aria-hidden` + **"Drag to explore" hint** mobile par
- **reduced-motion users: hamesha static fallback** (accessibility — ye rule kabhi nahi todna)

### Fix B: Product viewer mobile-first 🎯
**File:** `components/storefront/product-model-viewer.tsx`
- `frameloop="demand"` + `controls-change` par re-render → **battery 90% bachegi**
- `autoRotate` sirf desktop (pointer:fine) par; mobile par tap-to-rotate hint
- Tier se DPR + material quality
- Loading ke time poster image dikhao (abhi sirf text hai)
- **AR bonus (free, Google):** `<model-viewer>` web component — iOS par "AR Quick Look", Android par "Scene Viewer" — QR scan → phone me product AR me! Har device par "3D" ka jawab. (Aage ke liye — Fix 2 ke baad)

### Fix C: GLB upload pipeline (3D content har device par dikhne ke liye) 🔴
**Files:** `app/api/admin/media/upload/route.ts`, `components/admin-product-manager.tsx`
- `MODEL` kind: `.glb` (`model/gltf-binary`), `.gltf` (`model/gltf+json`) — **max 20MB**
- Vercel Blob SDK already hai (`@vercel/blob`) — wahi pipeline
- Admin form me "Upload 3D model" button → URL auto-fill
- Bina iske kisi product par 3D nahi aa sakta

### Fix D: 3D Manager ka route (feature accessible) 🔴
**Files:** `app/admin/store-3d/page.tsx` (naya), admin navigation
- `AdminStore3DManager` ko page do → aap apne 3D interfaces ko kisi bhi device se manage kar sako

### Fix E: Spatial home responsive verify
**Files:** `app/globals.css` (spatial sections)
- `interface-foundry/axon/prism` ke mobile styles check + fix (grid collapse, font sizes)
- Ye CSS hai — mobile par chalta hai, bas polish chahiye

---

## 4. Device Testing Matrix (implement ke baad)

| Device | Hero | Product viewer | Spatial home | Admin 3D manager |
|---|---|---|---|---|
| iPhone (Safari) | 3D medium | 3D + touch | ✅ | ✅ |
| Android mid (Chrome) | 3D medium | 3D + touch | ✅ | ✅ |
| iPad/tablet | 3D medium | 3D | ✅ | ✅ |
| Budget Android (2GB) | 3D low | 3D low | ✅ | ✅ |
| Desktop (mouse) | 3D high | 3D full | ✅ | ✅ |
| No-WebGL / data-saver | Poster fallback | Poster fallback | ✅ | ✅ |
| Reduced-motion | Static | Static | ✅ | ✅ |

Chrome DevTools device emulation se free me test + real device checklist.

---

## 5. Scope Options

| Option | Kya | Time |
|---|---|---|
| **A. Hero har device** | Fix A + tier system | ~3 hrs |
| **B. Product viewer har device** | Fix B | ~3 hrs |
| **C. Complete package** | A + B + C + D + E | ~1.5 din |
| **D. AR quick-look** (bonus) | C + model-viewer AR | +½ din |

**Meri recommendation: Option C** — ek baar me "3D har device" complete ho jayega.

---

## 6. Important — realistic expectation
- **WebGL wala 3D** har modern device par chale ga (2020+ phones, tablets, laptops) — quality tier ke sath
- **2015-2018 budget phones / no-WebGL** par poster fallback (aisa hi sahi — 3D ki jagah achi image + CSS depth)
- **Reduced-motion users** ke liye static — ye intentional hai (accessibility, kabhi override nahi karna)
- **Performance rule:** mobile par kabhi shadows nahi, dpr ≤1, `frameloop="demand"` — is se battery + smoothness dono

---

## 📣 Aage kya karein
- **"A karo"** → hero 3D mobile/tablet par (sabse zyada visible fix)
- **"C karo"** → complete package (recommended)
- **"C + AR karo"** → complete + AR quick-look
