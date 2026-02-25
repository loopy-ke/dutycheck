"""
Generate all static SEO pages into public/ so they work in both dev and prod.

Vite dev server serves public/ as-is.
Vite build copies public/ to dist/ alongside the bundled app.

Page hierarchy:
  /suv/                           → category listing (makes + counts)
  /suv/toyota/                    → make listing (all Toyota SUVs)
  /suv/toyota/harrier/            → model page (duty table for all valid years)
  /motorcycle/honda/cb400x/       → etc.

Run: python3 scripts/generate_pages.py
Also called by: npm run generate
"""

import json
import re
import math
import shutil
from pathlib import Path
from collections import defaultdict

# ── Config ────────────────────────────────────────────────────────────────

ROOT         = Path(__file__).parent.parent
CASCADE_FILE = ROOT / "data" / "crsp_cascade.json"
PUBLIC_DIR   = ROOT / "public"

SITE_URL     = "https://carduty.co.ke"
CSS_PATH     = "/css/styles.css"

CURRENT_YEAR = 2026
MAX_AGE      = 8
DIVISOR      = 2.4469

FINANCE_ACT_URL = "https://new.kenyalaw.org/akn/ke/act/2025/9/eng@2025-07-01"
CRSP_EXCEL_URL  = "https://www.kra.go.ke/images/publications/New-CRSP---July-2025.xlsx"
KRA_DUTY_PAGE   = "https://www.kra.go.ke/14-motor-vehicle-import-duty"

DEPRECIATION = [
    (1,  0.00),
    (2,  0.20),
    (3,  0.30),
    (4,  0.40),
    (5,  0.50),
    (6,  0.55),
    (7,  0.60),
    (8,  0.65),
]

# ── Helpers ───────────────────────────────────────────────────────────────

def slugify(s):
    s = str(s).lower()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"[\s]+", "-", s.strip())
    return re.sub(r"-+", "-", s)

def kes(n):
    return f"KES {int(n):,}"

def get_depreciation(age):
    for max_age, rate in DEPRECIATION:
        if age <= max_age:
            return rate
    return None

def calculate_duty(crsp, year):
    age  = CURRENT_YEAR - year
    depr = get_depreciation(age)
    if depr is None:
        return None
    pre   = crsp / DIVISOR
    cv    = pre * (1 - depr)
    id_   = cv * 0.25
    ed    = (cv + id_) * 0.20
    vat   = (cv + id_ + ed) * 0.16
    idf   = max(cv * 0.0225, 5000)
    rdl   = cv * 0.015
    total = id_ + ed + vat + idf + rdl
    return {
        "cv": round(cv), "import_duty": round(id_),
        "excise": round(ed), "vat": round(vat),
        "idf": round(idf), "rdl": round(rdl),
        "total": round(total), "depr_pct": int(depr * 100), "age": age,
    }

# ── Shared HTML partials ──────────────────────────────────────────────────

def header(back_label=None, back_href="/"):
    back = f'<a href="{back_href}" class="text-xs text-amber hover:underline">{back_label}</a>' if back_label else ""
    return f"""
  <header class="bg-charcoal border-b border-border-2 sticky top-0 z-40">
    <div class="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
      <a href="/" class="flex items-center gap-2.5">
        <div class="w-8 h-8 bg-amber rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <span class="font-bold text-white text-base tracking-tight">CarDuty</span>
      </a>
      {back}
    </div>
  </header>"""

def footer_html():
    return f"""
    <footer class="text-center text-xs text-text-subtle pb-10 space-y-2">
      <p>
        Source:
        <a href="{CRSP_EXCEL_URL}" class="text-amber hover:underline" target="_blank" rel="noopener noreferrer">KRA CRSP July 2025 (Excel)</a>
        &nbsp;·&nbsp;
        <a href="{FINANCE_ACT_URL}" class="text-amber hover:underline" target="_blank" rel="noopener noreferrer">Finance Act 2025</a>
        &nbsp;·&nbsp;
        <a href="{KRA_DUTY_PAGE}" class="text-amber hover:underline" target="_blank" rel="noopener noreferrer">KRA Motor Vehicle Import Duty</a>
      </p>
      <p>For guidance only. Verify with KRA or a licensed clearing agent before importing.</p>
    </footer>"""

def page_shell(title, desc, canonical, content, breadcrumb=""):
    return f"""<!DOCTYPE html>
<html lang="en-KE" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <link rel="canonical" href="{SITE_URL}{canonical}" />
  <meta property="og:title"       content="{title}" />
  <meta property="og:description" content="{desc}" />
  <meta property="og:url"         content="{SITE_URL}{canonical}" />
  <link rel="stylesheet" href="{CSS_PATH}" />
</head>
<body class="bg-bg text-text min-h-screen">
  {header('← Calculator', '/')}
  <main class="max-w-3xl mx-auto px-4 py-5 space-y-5">
    {breadcrumb}
    {content}
    {footer_html()}
  </main>
</body>
</html>"""

def breadcrumb_html(crumbs):
    """crumbs = list of (label, href) pairs, last one has no href"""
    parts = []
    for i, (label, href) in enumerate(crumbs):
        if href:
            parts.append(f'<a href="{href}" class="hover:text-amber transition-colors">{label}</a>')
        else:
            parts.append(f'<span class="text-text">{label}</span>')
        if i < len(crumbs) - 1:
            parts.append('<span>›</span>')
    inner = " ".join(parts)
    return f'<nav class="text-xs text-text-muted flex items-center gap-1.5 flex-wrap">{inner}</nav>'

# ── Category page: /suv/ ──────────────────────────────────────────────────

def make_category_page(category, makes, cat_slug):
    makes_sorted = sorted(makes.items())
    total_models = sum(len(ms) for ms in makes.values())

    cards = ""
    for make, models in makes_sorted:
        make_slug = slugify(make)
        sample    = kes(min(m["crsp"] for m in models))
        cards += f"""
      <a href="/{cat_slug}/{make_slug}/"
         class="bg-surface border border-border rounded-xl px-4 py-3 hover:border-amber transition-colors block group">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold text-sm text-text group-hover:text-amber transition-colors">{make}</p>
            <p class="text-text-subtle text-xs mt-0.5">{len(models)} model{'' if len(models)==1 else 's'}</p>
          </div>
          <svg class="w-4 h-4 text-text-subtle group-hover:text-amber transition-colors flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </a>"""

    content = f"""
    <div class="bg-charcoal rounded-2xl px-5 py-6 border border-border-2">
      <p class="text-text-subtle text-xs uppercase tracking-widest mb-1">Vehicle Category</p>
      <h1 class="text-2xl font-bold text-white">{category}</h1>
      <p class="text-text-muted text-sm mt-1">{len(makes_sorted)} makes · {total_models} models in the KRA CRSP July 2025</p>
    </div>
    <section class="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {cards}
    </section>
    <div class="bg-surface border border-amber/20 rounded-2xl px-5 py-4 text-center">
      <p class="text-sm text-text mb-2">Use the full interactive calculator</p>
      <a href="/#{ cat_slug}" class="inline-block bg-amber text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-amber-dark transition-colors">
        Open Calculator →
      </a>
    </div>"""

    bc = breadcrumb_html([("Home", "/"), (category, None)])

    return page_shell(
        title     = f"{category} Import Duty Kenya 2025 — CarDuty",
        desc      = f"Browse all {category} vehicles in the KRA CRSP July 2025 list. {len(makes_sorted)} makes, {total_models} models. Calculate your import duty instantly.",
        canonical = f"/{cat_slug}/",
        content   = content,
        breadcrumb= bc,
    )

# ── Make page: /suv/toyota/ ───────────────────────────────────────────────

def make_make_page(category, make, models, cat_slug, make_slug):
    cards = ""
    for i, m in enumerate(sorted(models, key=lambda x: x["model"])):
        model_slug = slugify(m["model"]) or f"model-{i}"
        parts = [
            f"{m['cc']}cc" if isinstance(m.get("cc"), int) else str(m["cc"]) if m.get("cc") else None,
            m.get("fuel", "").title() or None,
            m.get("tx"),
        ]
        meta = " · ".join(p for p in parts if p)

        # Calculate cheapest duty (8-year-old = most depreciation)
        cheapest = calculate_duty(m["crsp"], CURRENT_YEAR - MAX_AGE)
        duty_from = kes(cheapest["total"]) if cheapest else "N/A"

        cards += f"""
      <a href="/{cat_slug}/{make_slug}/{model_slug}/"
         class="bg-surface border border-border rounded-xl px-4 py-3 hover:border-amber transition-colors block group">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold text-sm text-text group-hover:text-amber transition-colors truncate">{m['model']}</p>
            <p class="text-text-subtle text-xs mt-0.5 truncate">{meta}</p>
          </div>
          <div class="text-right flex-shrink-0">
            <p class="text-text-subtle text-xs">CRSP</p>
            <p class="font-semibold text-xs text-amber">{kes(m['crsp'])}</p>
            <p class="text-text-subtle text-xs">duty from {duty_from}</p>
          </div>
        </div>
      </a>"""

    content = f"""
    <div class="bg-charcoal rounded-2xl px-5 py-6 border border-border-2">
      <p class="text-text-subtle text-xs uppercase tracking-widest mb-1">{category}</p>
      <h1 class="text-2xl font-bold text-white">{make}</h1>
      <p class="text-text-muted text-sm mt-1">{len(models)} model{'' if len(models)==1 else 's'} in the KRA CRSP July 2025</p>
    </div>
    <section class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {cards}
    </section>
    <div class="bg-surface border border-amber/20 rounded-2xl px-5 py-4 text-center">
      <p class="text-sm text-text mb-2">Use the full interactive calculator</p>
      <a href="/#{ cat_slug}/{make_slug}" class="inline-block bg-amber text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-amber-dark transition-colors">
        Open Calculator →
      </a>
    </div>"""

    bc = breadcrumb_html([("Home", "/"), (category, f"/{cat_slug}/"), (make, None)])

    return page_shell(
        title     = f"{make} {category} Import Duty Kenya 2025 — CarDuty",
        desc      = f"All {make} {category} models in the KRA CRSP July 2025. {len(models)} variants — click any model to see the full duty breakdown.",
        canonical = f"/{cat_slug}/{make_slug}/",
        content   = content,
        breadcrumb= bc,
    )

# ── Model page: /suv/toyota/harrier/ ─────────────────────────────────────

def make_model_page(category, make, model_obj, cat_slug, make_slug, model_slug):
    model = model_obj["model"]
    crsp  = model_obj["crsp"]
    cc    = model_obj.get("cc")
    fuel  = model_obj.get("fuel", "")
    tx    = model_obj.get("tx", "")

    meta_parts = [
        f"{cc}cc" if isinstance(cc, int) else str(cc) if cc else None,
        fuel.title() if fuel else None,
        tx or None,
        category,
    ]
    meta_str = " · ".join(p for p in meta_parts if p)

    # Build duty table rows
    rows = ""
    for yr in range(CURRENT_YEAR, CURRENT_YEAR - MAX_AGE - 1, -1):
        d = calculate_duty(crsp, yr)
        if not d:
            continue
        age_str = "New" if d["age"] == 0 else f"{d['age']} yr{'s' if d['age']!=1 else ''}"
        rows += f"""
        <tr class="border-t border-border hover:bg-surface-2 transition-colors">
          <td class="px-4 py-3 font-semibold text-sm text-text">{yr}</td>
          <td class="px-4 py-3 text-sm text-text-muted">{age_str}</td>
          <td class="px-4 py-3 text-sm text-text-muted">{d['depr_pct']}%</td>
          <td class="px-4 py-3 text-sm text-text">{kes(d['cv'])}</td>
          <td class="px-4 py-3 font-bold text-amber">{kes(d['total'])}</td>
        </tr>"""

    cheapest = calculate_duty(crsp, CURRENT_YEAR - MAX_AGE)
    duty_range = kes(cheapest["total"]) if cheapest else "N/A"

    schema = json.dumps({
        "@context": "https://schema.org",
        "@type": "HowTo",
        "name": f"How to calculate KRA import duty for {make} {model}",
        "description": f"Step-by-step KRA duty calculation for {make} {model} using official CRSP July 2025",
        "step": [
            {"@type": "HowToStep", "name": "CRSP lookup",     "text": f"CRSP value is {kes(crsp)} per the KRA official list"},
            {"@type": "HowToStep", "name": "Strip taxes",     "text": "Divide by 2.4469 to get pre-depreciation customs value"},
            {"@type": "HowToStep", "name": "Depreciation",    "text": "Apply 0–65% depending on age (8-year rule)"},
            {"@type": "HowToStep", "name": "Apply duty rates","text": "Import Duty 25% · Excise 20% · VAT 16% · IDF 2.25% · RDL 1.5%"},
        ]
    }, indent=2)

    content = f"""
  <script type="application/ld+json">
  {schema}
  </script>

    <div class="bg-charcoal rounded-2xl px-5 py-6 border border-border-2">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-text-subtle text-xs uppercase tracking-widest mb-1">{category}</p>
          <h1 class="text-xl font-bold text-white leading-tight">{make} {model}</h1>
          <p class="text-text-muted text-sm mt-1">{meta_str}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="text-text-subtle text-xs">CRSP Value</p>
          <p class="text-lg font-bold text-amber">{kes(crsp)}</p>
          <p class="text-text-subtle text-xs mt-0.5">July 2025</p>
        </div>
      </div>
    </div>

    <section class="bg-surface border border-border rounded-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-border">
        <h2 class="font-semibold text-base">KRA Duty by Year of Manufacture</h2>
        <p class="text-text-muted text-xs mt-0.5">
          All years valid under Kenya's 8-year rule. Cars from before {CURRENT_YEAR - MAX_AGE} cannot be imported.
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
          <tbody>{rows}</tbody>
        </table>
      </div>
    </section>

    <section class="bg-surface border border-border rounded-2xl px-5 py-4">
      <h3 class="font-semibold text-sm mb-3">How KRA calculated this</h3>
      <div class="bg-surface-2 border border-border rounded-xl px-4 py-3 font-mono text-xs text-text-muted space-y-1 leading-relaxed">
        <div>CRSP ({kes(crsp)}) <span class="text-text-subtle">÷ 2.4469</span> = pre-depreciation value</div>
        <div>× (1 − depreciation) = <strong class="text-text">Customs Value</strong></div>
        <div class="border-t border-border pt-1.5 mt-1.5"></div>
        <div>CV × 25% = Import Duty</div>
        <div>(CV + ID) × 20% = Excise Duty</div>
        <div>(CV + ID + ED) × 16% = VAT</div>
        <div>CV × 2.25% = IDF (min KES 5,000)</div>
        <div>CV × 1.5% = RDL</div>
      </div>
      <div class="mt-3 text-xs text-text-muted space-y-1">
        <p>Source: <a href="{CRSP_EXCEL_URL}" class="text-amber hover:underline" target="_blank" rel="noopener">KRA CRSP July 2025</a></p>
        <p>Rates: <a href="{FINANCE_ACT_URL}" class="text-amber hover:underline" target="_blank" rel="noopener">Finance Act 2025, Act No. 9 of 2025</a></p>
      </div>
    </section>

    <div class="bg-amber/10 border border-amber/30 rounded-2xl px-5 py-5 text-center">
      <p class="font-bold text-sm mb-1">Compare other vehicles or adjust the year interactively</p>
      <a href="/#{ cat_slug}/{make_slug}" class="inline-block bg-amber text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-amber-dark transition-colors mt-2">
        Open Calculator →
      </a>
    </div>"""

    bc = breadcrumb_html([
        ("Home", "/"),
        (category, f"/{cat_slug}/"),
        (make, f"/{cat_slug}/{make_slug}/"),
        (model, None),
    ])

    return page_shell(
        title     = f"{make} {model} Import Duty Kenya 2025 — CarDuty",
        desc      = f"KRA import duty for {make} {model}. CRSP: {kes(crsp)}. Duty from {duty_range} depending on year. Full breakdown verified against official KRA formula.",
        canonical = f"/{cat_slug}/{make_slug}/{model_slug}/",
        content   = content,
        breadcrumb= bc,
    )

# ── Main ──────────────────────────────────────────────────────────────────

def main():
    data = json.loads(CASCADE_FILE.read_text())

    stats = {"categories": 0, "makes": 0, "models": 0}

    for category, makes in data["data"].items():
        cat_slug = slugify(category)
        cat_dir  = PUBLIC_DIR / cat_slug
        cat_dir.mkdir(parents=True, exist_ok=True)

        # Category index page
        (cat_dir / "index.html").write_text(
            make_category_page(category, makes, cat_slug), encoding="utf-8"
        )
        stats["categories"] += 1

        for make, models in makes.items():
            make_slug = slugify(make)
            make_dir  = cat_dir / make_slug
            make_dir.mkdir(parents=True, exist_ok=True)

            # Make index page
            (make_dir / "index.html").write_text(
                make_make_page(category, make, models, cat_slug, make_slug), encoding="utf-8"
            )
            stats["makes"] += 1

            seen_slugs = {}
            for i, model_obj in enumerate(models):
                model_slug = slugify(model_obj["model"]) or f"model-{i}"

                # Deduplicate slugs within a make
                if model_slug in seen_slugs:
                    model_slug = f"{model_slug}-{i}"
                seen_slugs[model_slug] = True

                model_dir = make_dir / model_slug
                model_dir.mkdir(parents=True, exist_ok=True)

                (model_dir / "index.html").write_text(
                    make_model_page(category, make, model_obj, cat_slug, make_slug, model_slug),
                    encoding="utf-8"
                )
                stats["models"] += 1

    total = stats["categories"] + stats["makes"] + stats["models"]
    print(f"Generated {total} pages into public/")
    print(f"  {stats['categories']} category pages")
    print(f"  {stats['makes']} make pages")
    print(f"  {stats['models']} model pages")
    print(f"\nExamples:")
    print(f"  /suv/")
    print(f"  /suv/toyota/")
    print(f"  /suv/toyota/harrier/")

if __name__ == "__main__":
    main()
