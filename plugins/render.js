/**
 * Duty Check — Shared page renderer (dev SSR + prod static generation)
 *
 * In dev:  Vite middleware calls renderUrl() on every request
 * In prod: build script calls renderAll() to write static HTML files
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ── Data ─────────────────────────────────────────────────────────────────

const ROOT = new URL("..", import.meta.url).pathname;

let _crsp = null;
function getCrsp() {
  if (!_crsp) {
    const raw = readFileSync(resolve(ROOT, "data/crsp_cascade.json"), "utf-8");
    _crsp = JSON.parse(raw);
  }
  return _crsp;
}

// ── KRA constants ─────────────────────────────────────────────────────────

const CURRENT_YEAR = 2026;
const MAX_AGE      = 8;
const DIVISOR      = 2.4469;
const FINANCE_ACT  = "https://new.kenyalaw.org/akn/ke/act/2025/9/eng@2025-07-01";
const CRSP_EXCEL   = "https://www.kra.go.ke/images/publications/New-CRSP---July-2025.xlsx";
const KRA_DUTY_PG  = "https://www.kra.go.ke/14-motor-vehicle-import-duty";

const DEPRECIATION = [
  [1, 0.00], [2, 0.20], [3, 0.30], [4, 0.40],
  [5, 0.50], [6, 0.55], [7, 0.60], [8, 0.65],
];

// ── Helpers ───────────────────────────────────────────────────────────────

export function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function kes(n) {
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}

function getDepr(age) {
  for (const [max, rate] of DEPRECIATION) {
    if (age <= max) return rate;
  }
  return null;
}

function calcDuty(crsp, year) {
  const age  = CURRENT_YEAR - year;
  const depr = getDepr(age);
  if (depr === null) return null;
  const pre  = crsp / DIVISOR;
  const cv   = pre * (1 - depr);
  const id_  = cv * 0.25;
  const ed   = (cv + id_) * 0.20;
  const vat  = (cv + id_ + ed) * 0.16;
  const idf  = Math.max(cv * 0.0225, 5000);
  const rdl  = cv * 0.015;
  return {
    cv: Math.round(cv), total: Math.round(id_ + ed + vat + idf + rdl),
    depr_pct: Math.round(depr * 100), age,
  };
}

// Build a slug→index lookup for a make's models
function buildModelIndex(models) {
  const seen = {};
  return models.map((m, i) => {
    let slug = slugify(m.model) || `model-${i}`;
    if (seen[slug] !== undefined) slug = `${slug}-${i}`;
    seen[slug] = i;
    return { ...m, slug };
  });
}

// ── Shared layout ─────────────────────────────────────────────────────────

function breadcrumbJsonLd(crumbs) {
  if (!crumbs.length) return "";
  const items = crumbs.map(([name, href], i) => {
    const entry = { "@type": "ListItem", "position": i + 1, "name": name };
    if (href) entry.item = `https://dutycheck.co.ke${href}`;
    return entry;
  });
  return JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": items });
}

function layout({ title, desc, canonical, body, crumbs = [], jsonLd = [] }) {
  const bc = crumbs.length ? `
  <nav class="text-xs text-text-muted flex items-center gap-1.5 flex-wrap">
    ${crumbs.map(([label, href], i) =>
      (href ? `<a href="${href}" class="hover:text-amber transition-colors">${label}</a>` : `<span class="text-text">${label}</span>`) +
      (i < crumbs.length - 1 ? " <span>›</span>" : "")
    ).join(" ")}
  </nav>` : "";

  const allJsonLd = [...jsonLd];
  if (crumbs.length) allJsonLd.push(breadcrumbJsonLd(crumbs));
  const ldScripts = allJsonLd.map(ld => `<script type="application/ld+json">${ld}</script>`).join("\n  ");

  return `<!DOCTYPE html>
<html lang="en-KE" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <link rel="canonical" href="https://dutycheck.co.ke${canonical}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="https://dutycheck.co.ke${canonical}" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  ${ldScripts}
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-VT7S4F6QJG"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-VT7S4F6QJG');
  </script>
  <link rel="stylesheet" href="/css/styles.css" />
</head>
<body class="bg-bg text-text min-h-screen">
  <header class="bg-charcoal border-b border-border-2 sticky top-0 z-40">
    <div class="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5">
        <div class="w-8 h-8 bg-amber rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <span class="font-bold text-white text-base tracking-tight">Duty Check</span>
      </a>
      <a href="/" class="text-xs text-amber hover:underline">← Calculator</a>
    </div>
  </header>
  <main class="max-w-3xl mx-auto px-4 py-5 space-y-5">
    ${bc}
    ${body}
    <footer class="text-center text-xs text-text-subtle pb-10 space-y-2">
      <p>
        Source:
        <a href="${CRSP_EXCEL}" class="text-amber hover:underline" target="_blank" rel="noopener">KRA CRSP July 2025</a>
        &nbsp;·&nbsp;
        <a href="${FINANCE_ACT}" class="text-amber hover:underline" target="_blank" rel="noopener">Finance Act 2025</a>
        &nbsp;·&nbsp;
        <a href="${KRA_DUTY_PG}" class="text-amber hover:underline" target="_blank" rel="noopener">KRA Duty Page</a>
      </p>
      <p>For guidance only. Verify with KRA or a licensed clearing agent.</p>
    </footer>
  </main>
</body>
</html>`;
}

// ── Page renderers ────────────────────────────────────────────────────────

function renderCategoryPage(category, catSlug) {
  const { data } = getCrsp();
  const makes = data[category];
  if (!makes) return null;

  const makeEntries = Object.entries(makes).sort(([a], [b]) => a.localeCompare(b));
  const totalModels = makeEntries.reduce((s, [, ms]) => s + ms.length, 0);

  const cards = makeEntries.map(([make, models]) => {
    const makeSlug = slugify(make);
    return `
    <a href="/${catSlug}/${makeSlug}/"
       class="bg-surface border border-border rounded-xl px-4 py-3 hover:border-amber transition-colors block group">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-semibold text-sm text-text group-hover:text-amber transition-colors">${make}</p>
          <p class="text-text-subtle text-xs mt-0.5">${models.length} model${models.length === 1 ? "" : "s"}</p>
        </div>
        <svg class="w-4 h-4 text-text-subtle group-hover:text-amber transition-colors flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/>
        </svg>
      </div>
    </a>`;
  }).join("");

  const body = `
    <div class="bg-charcoal rounded-2xl px-5 py-6 border border-border-2">
      <p class="text-text-subtle text-xs uppercase tracking-widest mb-1">Vehicle Category</p>
      <h1 class="text-2xl font-bold text-white">${category}</h1>
      <p class="text-text-muted text-sm mt-1">${makeEntries.length} makes · ${totalModels} models in KRA CRSP July 2025</p>
    </div>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">${cards}</div>
    <div class="bg-surface border border-amber/20 rounded-2xl px-5 py-4 text-center">
      <p class="text-sm text-text mb-2">Use the full interactive calculator</p>
      <a href="/" class="inline-block bg-amber text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-amber-dark transition-colors">
        Calculate My Duty →
      </a>
    </div>`;

  return layout({
    title:    `${category} Import Duty Kenya 2025 — Duty Check`,
    desc:     `Browse all ${category} vehicles in KRA CRSP July 2025. ${makeEntries.length} makes, ${totalModels} models. Calculate import duty instantly.`,
    canonical: `/${catSlug}/`,
    crumbs:   [["Home", "/"], [category, null]],
    body,
  });
}

function renderMakePage(category, catSlug, make, makeSlug) {
  const { data } = getCrsp();
  const models = data[category]?.[make];
  if (!models) return null;

  const indexed = buildModelIndex(models);
  const sorted  = [...indexed].sort((a, b) => a.model.localeCompare(b.model));

  const cards = sorted.map(m => {
    const cheapest = calcDuty(m.crsp, CURRENT_YEAR - MAX_AGE);
    const parts = [
      typeof m.cc === "number" ? `${m.cc}cc` : m.cc,
      m.fuel ? m.fuel.charAt(0) + m.fuel.slice(1).toLowerCase() : null,
      m.tx,
    ].filter(Boolean).join(" · ");

    return `
    <a href="/${catSlug}/${makeSlug}/${m.slug}/"
       class="bg-surface border border-border rounded-xl px-4 py-3 hover:border-amber transition-colors block group">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="font-semibold text-sm text-text group-hover:text-amber transition-colors truncate">${m.model}</p>
          <p class="text-text-subtle text-xs mt-0.5 truncate">${parts}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="text-text-subtle text-xs">CRSP</p>
          <p class="font-semibold text-xs text-amber">${kes(m.crsp)}</p>
          ${cheapest ? `<p class="text-text-subtle text-xs">duty from ${kes(cheapest.total)}</p>` : ""}
        </div>
      </div>
    </a>`;
  }).join("");

  const body = `
    <div class="bg-charcoal rounded-2xl px-5 py-6 border border-border-2">
      <p class="text-text-subtle text-xs uppercase tracking-widest mb-1">${category}</p>
      <h1 class="text-2xl font-bold text-white">${make}</h1>
      <p class="text-text-muted text-sm mt-1">${models.length} model${models.length === 1 ? "" : "s"} in KRA CRSP July 2025</p>
    </div>
    <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">${cards}</div>
    <div class="bg-surface border border-amber/20 rounded-2xl px-5 py-4 text-center">
      <a href="/" class="inline-block bg-amber text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-amber-dark transition-colors">
        Calculate My Duty →
      </a>
    </div>`;

  return layout({
    title:    `${make} ${category} Import Duty Kenya 2025 — Duty Check`,
    desc:     `All ${make} ${category} models in KRA CRSP July 2025. ${models.length} variants with full duty breakdowns.`,
    canonical: `/${catSlug}/${makeSlug}/`,
    crumbs:   [["Home", "/"], [category, `/${catSlug}/`], [make, null]],
    body,
  });
}

function renderModelPage(category, catSlug, make, makeSlug, modelSlug) {
  const { data } = getCrsp();
  const models = data[category]?.[make];
  if (!models) return null;

  const indexed = buildModelIndex(models);
  const m = indexed.find(x => x.slug === modelSlug);
  if (!m) return null;

  const rows = Array.from({ length: MAX_AGE + 1 }, (_, i) => CURRENT_YEAR - i)
    .map(yr => {
      const d = calcDuty(m.crsp, yr);
      if (!d) return "";
      const ageStr = d.age === 0 ? "New" : `${d.age} yr${d.age !== 1 ? "s" : ""}`;
      return `
      <tr class="border-t border-border hover:bg-surface-2 transition-colors">
        <td class="px-4 py-3 font-semibold text-sm"><a href="/${catSlug}/${makeSlug}/${m.slug}/${yr}/" class="text-text hover:text-amber transition-colors">${yr}</a></td>
        <td class="px-4 py-3 text-sm text-text-muted">${ageStr}</td>
        <td class="px-4 py-3 text-sm text-text-muted">${d.depr_pct}%</td>
        <td class="px-4 py-3 text-sm text-text">${kes(d.cv)}</td>
        <td class="px-4 py-3 font-bold text-amber">${kes(d.total)}</td>
      </tr>`;
    }).join("");

  const parts = [
    typeof m.cc === "number" ? `${m.cc}cc` : m.cc,
    m.fuel ? m.fuel.charAt(0) + m.fuel.slice(1).toLowerCase() : null,
    m.tx,
    category,
  ].filter(Boolean).join(" · ");

  const cheapest = calcDuty(m.crsp, CURRENT_YEAR - MAX_AGE);

  const body = `
    <div class="bg-charcoal rounded-2xl px-5 py-6 border border-border-2">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-text-subtle text-xs uppercase tracking-widest mb-1">${category}</p>
          <h1 class="text-xl font-bold text-white leading-tight">${make} ${m.model}</h1>
          <p class="text-text-muted text-sm mt-1">${parts}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="text-text-subtle text-xs">CRSP Value</p>
          <p class="text-lg font-bold text-amber">${kes(m.crsp)}</p>
          <p class="text-text-subtle text-xs mt-0.5">July 2025</p>
        </div>
      </div>
    </div>

    <section class="bg-surface border border-border rounded-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-border">
        <h2 class="font-semibold text-base">KRA Duty by Year of Manufacture</h2>
        <p class="text-text-muted text-xs mt-0.5">
          Valid years under Kenya's 8-year rule. Cars before ${CURRENT_YEAR - MAX_AGE} cannot be imported.
        </p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-surface-2">
            <tr>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Year</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Age</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Depreciation</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Customs Value</th>
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Total Duty</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>

    <section class="bg-surface border border-border rounded-2xl px-5 py-4">
      <h3 class="font-semibold text-sm mb-3">How KRA calculated this</h3>
      <div class="bg-surface-2 border border-border rounded-xl px-4 py-3 font-mono text-xs text-text-muted space-y-1 leading-relaxed">
        <div>CRSP (${kes(m.crsp)}) <span class="text-text-subtle">÷ 2.4469</span> = pre-depreciation value</div>
        <div>× (1 − depreciation) = <strong class="text-text">Customs Value</strong></div>
        <div class="border-t border-border pt-1.5 mt-1.5"></div>
        <div>CV × 25% = Import Duty &nbsp;·&nbsp; (CV+ID) × 20% = Excise Duty</div>
        <div>(CV+ID+ED) × 16% = VAT &nbsp;·&nbsp; CV × 2.25% = IDF &nbsp;·&nbsp; CV × 1.5% = RDL</div>
      </div>
      <div class="mt-3 text-xs text-text-muted space-y-1">
        <p>Source: <a href="${CRSP_EXCEL}" class="text-amber hover:underline" target="_blank" rel="noopener">KRA CRSP July 2025 (Excel)</a></p>
        <p>Rates: <a href="${FINANCE_ACT}" class="text-amber hover:underline" target="_blank" rel="noopener">Finance Act 2025, Act No. 9 of 2025</a></p>
      </div>
    </section>

    <div class="bg-amber/10 border border-amber/30 rounded-2xl px-5 py-5 text-center">
      <p class="font-bold text-sm mb-1">Compare other cars interactively</p>
      <a href="/" class="inline-block bg-amber text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-amber-dark transition-colors mt-2">
        Calculate My Duty →
      </a>
    </div>`;

  return layout({
    title:    `${make} ${m.model} Import Duty Kenya 2025 — Duty Check`,
    desc:     `KRA import duty for ${make} ${m.model}. CRSP: ${kes(m.crsp)}. Duty from ${cheapest ? kes(cheapest.total) : "N/A"} depending on year. Full verified breakdown.`,
    canonical: `/${catSlug}/${makeSlug}/${modelSlug}/`,
    crumbs:   [["Home", "/"], [category, `/${catSlug}/`], [make, `/${catSlug}/${makeSlug}/`], [m.model, null]],
    body,
  });
}

function renderYearPage(category, catSlug, make, makeSlug, modelSlug, year) {
  const { data } = getCrsp();
  const models = data[category]?.[make];
  if (!models) return null;

  const indexed = buildModelIndex(models);
  const m = indexed.find(x => x.slug === modelSlug);
  if (!m) return null;

  const age = CURRENT_YEAR - year;
  const depr = getDepr(age);
  if (depr === null) return null;

  const pre   = m.crsp / DIVISOR;
  const cv    = pre * (1 - depr);
  const id_   = cv * 0.25;
  const ed    = (cv + id_) * 0.20;
  const vat   = (cv + id_ + ed) * 0.16;
  const idf   = Math.max(cv * 0.0225, 5000);
  const rdl   = cv * 0.015;
  const total = id_ + ed + vat + idf + rdl;

  const depr_pct = Math.round(depr * 100);
  const ageStr = age === 0 ? "Brand new (under 1 year)" : `${age} year${age !== 1 ? "s" : ""} old`;
  const parts = [
    typeof m.cc === "number" ? `${m.cc}cc` : m.cc,
    m.fuel ? m.fuel.charAt(0) + m.fuel.slice(1).toLowerCase() : null,
    m.tx, category,
  ].filter(Boolean).join(" · ");

  const rows = [
    { label: "CRSP Value",                  note: "Official KRA CRSP July 2025",                                  value: m.crsp, cls: ""          },
    { label: "÷ 2.4469",                    note: "KRA valuation factor",                                         value: pre,    cls: ""          },
    { label: `− ${depr_pct}% depreciation`, note: `${ageStr} · direct import`,                                   value: cv,     cls: "highlight" },
    { label: "Import Duty (25%)",           note: "Customs Value × 25%",                                          value: id_,   cls: ""          },
    { label: "Excise Duty (20%)",           note: "(CV + Import Duty) × 20%",                                     value: ed,     cls: ""          },
    { label: "VAT (16%)",                   note: "(CV + ID + Excise) × 16%",                                     value: vat,    cls: ""          },
    { label: "IDF (2.25%)",                 note: `CV × 2.25%${idf === 5000 ? " · min KES 5,000 applied" : ""}`, value: idf,    cls: ""          },
    { label: "RDL (1.5%)",                  note: "Railway Development Levy",                                     value: rdl,    cls: ""          },
    { label: "Total KRA Duty",              note: "Import Duty + Excise + VAT + IDF + RDL",                      value: total,  cls: "total"     },
  ].map(({ label, note, value, cls }) => {
    if (cls === "total") return `
      <div class="px-5 py-4 bg-charcoal flex items-center justify-between gap-3">
        <div><p class="font-semibold text-sm text-white">${label}</p><p class="text-xs mt-0.5 text-text-subtle">${note}</p></div>
        <p class="font-bold text-white text-lg flex-shrink-0">${kes(value)}</p>
      </div>`;
    if (cls === "highlight") return `
      <div class="px-5 py-3.5 bg-amber/5 border-l-2 border-amber flex items-center justify-between gap-3">
        <div><p class="font-semibold text-sm text-text">${label}</p><p class="text-xs mt-0.5 text-text-muted">${note}</p></div>
        <p class="font-bold text-amber flex-shrink-0">${kes(value)}</p>
      </div>`;
    return `
      <div class="px-5 py-3.5 flex items-center justify-between gap-3">
        <div><p class="font-semibold text-sm text-text">${label}</p><p class="text-xs mt-0.5 text-text-muted">${note}</p></div>
        <p class="font-bold text-text flex-shrink-0">${kes(value)}</p>
      </div>`;
  }).join("");

  const body = `
    <div class="bg-charcoal rounded-2xl px-5 py-6 border border-border-2">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-text-subtle text-xs uppercase tracking-widest mb-1">${category} · ${year}</p>
          <h1 class="text-xl font-bold text-white leading-tight">${make} ${m.model}</h1>
          <p class="text-text-muted text-sm mt-1">${parts}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="text-text-subtle text-xs">Total KRA Duty</p>
          <p class="text-xl font-bold text-amber">${kes(total)}</p>
          <p class="text-text-subtle text-xs mt-0.5">${depr_pct}% depreciation</p>
        </div>
      </div>
    </div>
    <section class="bg-surface border border-border rounded-2xl overflow-hidden">
      <div class="px-5 py-3.5 border-b border-border">
        <h2 class="font-semibold text-base">Full Duty Breakdown</h2>
        <p class="text-text-muted text-xs mt-0.5">${ageStr} · ${depr_pct}% depreciation · Finance Act 2025</p>
      </div>
      <div class="divide-y divide-border">${rows}</div>
    </section>
    <div class="grid grid-cols-2 gap-3">
      <a href="/${catSlug}/${makeSlug}/${modelSlug}/"
         class="bg-surface border border-border rounded-xl px-4 py-3 text-center hover:border-amber transition-colors block">
        <p class="text-xs text-text-muted mb-0.5">Compare all years</p>
        <p class="font-semibold text-sm text-text">${make} ${m.model}</p>
      </a>
      <a href="/"
         class="bg-amber/10 border border-amber/30 rounded-xl px-4 py-3 text-center hover:bg-amber/20 transition-colors block">
        <p class="text-xs text-amber mb-0.5">Interactive calculator</p>
        <p class="font-semibold text-sm text-amber">Calculate My Duty →</p>
      </a>
    </div>`;

  const faqJsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `How much is the import duty for a ${year} ${make} ${m.model} in Kenya?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `The KRA import duty for a ${year} ${make} ${m.model} is ${kes(total)}. This includes Import Duty (${kes(id_)}), Excise Duty (${kes(ed)}), VAT (${kes(vat)}), IDF (${kes(idf)}), and RDL (${kes(rdl)}), calculated on a Customs Value of ${kes(cv)} after ${depr_pct}% depreciation under the Finance Act 2025.`,
        },
      },
      {
        "@type": "Question",
        "name": `What is the CRSP value for ${make} ${m.model}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `The official KRA CRSP (Current Retail Selling Price) for ${make} ${m.model} is ${kes(m.crsp)} as per the KRA CRSP list dated July 2025.`,
        },
      },
      {
        "@type": "Question",
        "name": `Can I import a ${year} ${make} ${m.model} into Kenya?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": `${age <= MAX_AGE ? `Yes. A ${year} ${make} ${m.model} is ${ageStr} and is within Kenya's 8-year import rule. Total KRA duty payable is ${kes(total)}.` : `No. Kenya's 8-year rule prohibits importing vehicles more than 8 years old. A ${year} vehicle would be ${age} years old.`}`,
        },
      },
    ],
  });

  return layout({
    title:    `${make} ${m.model} ${year} Import Duty Kenya — ${kes(total)} — Duty Check`,
    desc:     `KRA import duty for a ${year} ${make} ${m.model}: ${kes(total)} total. CRSP ${kes(m.crsp)}, Customs Value ${kes(cv)}, ${depr_pct}% depreciation. Finance Act 2025.`,
    canonical: `/${catSlug}/${makeSlug}/${modelSlug}/${year}/`,
    crumbs:   [["Home", "/"], [category, `/${catSlug}/`], [make, `/${catSlug}/${makeSlug}/`], [m.model, `/${catSlug}/${makeSlug}/${modelSlug}/`], [String(year), null]],
    jsonLd:   [faqJsonLd],
    body,
  });
}

// ── Route resolver ────────────────────────────────────────────────────────

/**
 * Given a URL pathname, return rendered HTML or null (not a known route).
 * Handles: /:cat/, /:cat/:make/, /:cat/:make/:model/
 */
export function renderUrl(pathname) {
  const { categories, data } = getCrsp();

  // Normalise: strip leading slash, split on /
  const parts = pathname.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
  if (parts.length === 0) return null; // homepage handled by Vite

  const [catSlug, makeSlug, modelSlug, yearStr] = parts;

  // Build reverse maps: slug → canonical name
  const catBySlug = {};
  for (const cat of categories) catBySlug[slugify(cat)] = cat;

  const category = catBySlug[catSlug];
  if (!category) return null; // not a category route

  if (!makeSlug) return renderCategoryPage(category, catSlug);

  const makeBySlug = {};
  for (const make of Object.keys(data[category] || {})) {
    makeBySlug[slugify(make)] = make;
  }
  const make = makeBySlug[makeSlug];
  if (!make) return null;

  if (!modelSlug) return renderMakePage(category, catSlug, make, makeSlug);

  if (!yearStr) return renderModelPage(category, catSlug, make, makeSlug, modelSlug);

  const year = parseInt(yearStr, 10);
  if (isNaN(year)) return null;
  return renderYearPage(category, catSlug, make, makeSlug, modelSlug, year);
}

// Prod generation is handled by scripts/generate_pages.js
