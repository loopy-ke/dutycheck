# Duty Check — Todo

## In Progress / Recent
- [x] Vite + Tailwind v4 calculator setup
- [x] CRSP cascade data (11 categories, 5,683 entries)
- [x] Dark/light mode
- [x] Cascading category → make → model → year flow with chips
- [x] Collapsible sections (auto-collapse on next step)
- [x] Auto-calculate on year click (no button)
- [x] Real URL paths via pushState (/suv/toyota/harrier/2022/)
- [x] Dev SSR via Vite middleware, prod static generation
- [x] Year pages: /suv/toyota/harrier/2022/ (SEO + shareable)
- [x] SVG icons fix (DOMParser "text/html" mode)
- [x] Human-readable formula section

## Pending Features

### High priority
- [ ] Insurance estimate widget — show 4-6% of CRSP annually in results, "Get quotes" CTA → partner with Britam / Jubilee / CIC
- [ ] Finance pre-qualification CTA — show below total duty when duty+car cost > ~KES 3M, pass vehicle details to Stanbic / NCBA / I&M asset finance
- [ ] Turbolinks-style navigation — @hotwired/turbo to intercept link clicks and swap body without full page reload (app feel)
- [ ] Fix external links — verify KRA CRSP Excel URL, Finance Act URL, KRA duty page URL actually resolve

### Medium priority
- [ ] Model page as self-contained calculator — trim selector, interactive year picker, full breakdown on /suv/toyota/harrier/ page
- [ ] Compare feature — /compare/toyota-harrier/mazda-cx5 side-by-side
- [ ] Prod build test — run npm run build and verify all pages generate correctly

### SEO / Content
- [ ] JSON-LD structured data on model/year pages (FAQPage or Product schema)
- [ ] Sitemap.xml generation in build script
- [ ] robots.txt

## Notes

### Architecture
- Dev: Vite middleware intercepts routes, renders on the fly
- Prod: `npm run build` → vite build + generate_pages.js writes ~50,000+ static HTML pages
- CSS: @tailwindcss/cli compiles to public/css/styles.css (fixed path for static pages)
- Data: data/crsp_cascade.json (CRSP July 2025, 11 categories)

### Revenue streams identified
1. Clearing agent referral (primary)
2. Insurance lead gen — Britam/Jubilee/CIC partnership
3. Vehicle finance referral — Stanbic/NCBA/I&M asset finance

### Key URLs
- CRSP: https://www.kra.go.ke/images/publications/New-CRSP---July-2025.xlsx
- Finance Act: https://new.kenyalaw.org/akn/ke/act/2025/9/eng@2025-07-01
- KRA Duty: https://www.kra.go.ke/14-motor-vehicle-import-duty
