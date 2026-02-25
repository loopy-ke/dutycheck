# CarDuty — KRA Car Import Duty Calculator

> The only Kenya car duty calculator that shows you exactly how KRA calculates your duty — step by step, verified against the official KRA valuation template.

**Live at:** [carduty.co.ke](https://carduty.co.ke)

---

## What is CarDuty?

CarDuty is a transparent, SEO-optimised KRA duty calculator for Kenya car imports. Unlike black-box competitors, CarDuty shows the full calculation breakdown:

1. CRSP lookup from the official July 2025 KRA list (5,200+ models)
2. Tax-stripping step (÷2.4469 multiplier explained)
3. Age-based depreciation applied correctly
4. Each duty line item with the exact rate
5. Full landed cost including port, clearing, and transport estimates

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Hosting:** Vercel (free tier)
- **Data:** Static JSON from KRA CRSP database (no backend required)
- **Styling:** Tailwind CSS
- **Analytics:** Google Analytics 4

---

## Features (Roadmap)

### Phase 1 — MVP

- [x] Repo initialised
- [ ] Calculator with full CRSP database (5,200+ models)
- [ ] Step-by-step duty breakdown (transparent methodology)
- [ ] Mobile-first responsive design
- [ ] WhatsApp share button

### Phase 2 — SEO Foundation

- [ ] Static pages for top 200 most-searched car models
- [ ] Blog: 8-Year Rule, CRSP 2025 Explained, Cheapest Cars to Import
- [ ] Schema markup (FAQ, HowTo, Calculator)
- [ ] Google Search Console + sitemap

### Phase 3 — Growth

- [ ] Auto-generated pages for all 5,200+ CRSP models (long-tail SEO)
- [ ] Landed cost calculator (auction + shipping + duty + port + NTSA)
- [ ] Model comparison tool
- [ ] Email capture for CRSP update alerts

### Phase 4 — Monetise

- [ ] Clearing agent referral partnerships
- [ ] Car exporter affiliate links (SBT, BeForward)
- [ ] Google AdSense
- [ ] Premium PDF export

---

## KRA Duty Methodology

CarDuty uses the correct KRA formula:

```
CRSP Value (from official list)
  × depreciation factor            ← based on vehicle age
  = Customs Value (CV)

Import Duty     = CV × 25%
Excise Duty     = (CV + Import Duty) × 20%
VAT             = (CV + Import Duty + Excise Duty) × 16%
IDF             = CV × 2.25%  (min KES 5,000)
RDL             = CV × 1.5%
───────────────────────────────
Total Tax Due
```

---

## Local Development

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build
```

---

## Competitive Edge

| Feature                  | CarDuty | Competitors   |
| ------------------------ | ------- | ------------- |
| Transparent formula      | ✓       | ✗ (black box) |
| Correct CRSP 2025 rates  | ✓       | Mostly 2019   |
| Correct tax-stripping    | ✓       | Rarely        |
| Mobile-first             | ✓       | Mixed         |
| WhatsApp share           | ✓       | Rare          |
| Model-specific SEO pages | ✓       | None          |

---

## License

MIT
