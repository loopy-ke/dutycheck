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
- [x] Insurance estimate widget — leadGenHtml() on year pages: 4-6% of CRSP/year estimate + "Get insurance quotes" CTA (WhatsApp enquiry; swap for Britam/Jubilee/CIC partner deep-link once signed)
- [x] Finance pre-qualification CTA — leadGenHtml() shows asset-finance CTA when crsp+duty > KES 3M, passes vehicle + all-in cost (WhatsApp enquiry; swap for Stanbic/NCBA/I&M link once signed)
- [x] Turbolinks-style navigation — @hotwired/turbo (vendored to public/vendor/turbo.min.js, auto-starts); GA page_view on turbo:load via public/turbo-init.js; calculator + theme re-init idempotently on turbo:load
- [x] Fix external links — CRSP Excel + KRA duty page 200 OK; Finance Act URL corrected to /akn/ke/act/2025/9/eng (old @2025-07-01 point-in-time 404'd)

### Medium priority
- [x] Model page — fully clickable year-by-year duty table (each row → full breakdown); trim distinction is per-model CRSP row. (Interactive JS year picker deferred as redundant with the table.)
- [x] Compare feature — /compare/{comboA}/{comboB}/ side-by-side (renderComparePage)
- [x] Prod build test — npm run build generates all pages, exit 0

### SEO / Content
- [x] Canonical domain fix: ALL refs (canonical, og:url, JSON-LD, sitemap, robots) now use www (matches DNS naked→www 301). Fixes GSC www/apex split.
- [x] JSON-LD structured data: BreadcrumbList + FAQPage on generated pages (render.js); WebApplication + WebSite on homepage
- [x] Fix GSC "Missing field 'item' (in 'itemListElement')" — every BreadcrumbList ListItem now emits `item`; trailing self-crumb uses the page canonical URL (render.js breadcrumbJsonLd)
- [x] Sitemap.xml generation in build script (sitemap-index.xml + sitemap.xml + 11 per-category sitemaps)
- [x] robots.txt with Sitemap (public/robots.txt, now www)
- [x] Title/description intent tuning toward "price in kenya" — year page title now "... Import Duty & Price in Kenya", desc leads with "{year} {make} {model} price in Kenya"; model page already "Price & CRSP"
- [x] og:image / twitter:image — branded 1200x630 card (public/og-image.png, source scripts/og-card.svg); summary_large_image on homepage + generated pages
- [x] Product/Vehicle schema on model/year pages — vehicleJsonLd() (schema.org Car) wired into model, year & compare pages with brand, CRSP offer & duty PropertyValue

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
