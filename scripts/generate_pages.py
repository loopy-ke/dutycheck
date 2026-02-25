"""
Generate pre-rendered static HTML pages for all CRSP vehicles.

One page per CRSP entry: /duty/{category}/{make-slug}/{model-slug}/index.html

Each page shows:
- Vehicle details
- Pre-calculated KRA duty table for all valid years (2018–2026)
- SEO title/description targeting "Toyota Harrier import duty Kenya" etc.

Run after vite build:
  python3 scripts/generate_pages.py

Output: dist/duty/...
"""

import json
import re
import math
import shutil
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────

DIST_DIR     = Path(__file__).parent.parent / "dist"
CASCADE_FILE = Path(__file__).parent.parent / "data" / "crsp_cascade.json"

CURRENT_YEAR = 2026
MAX_AGE      = 8
DIVISOR      = 2.4469

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

# Read the compiled CSS/JS asset names from Vite's output
def get_assets():
    assets_dir = DIST_DIR / "assets"
    css = next(assets_dir.glob("index-*.css"), None)
    js  = next(assets_dir.glob("index-*.js"), None)
    return (
        f"/assets/{css.name}" if css else "/assets/index.css",
        f"/assets/{js.name}"  if js else "/assets/index.js",
    )

# ── KRA duty calculation ──────────────────────────────────────────────────

def get_depreciation(age):
    for max_age, rate in DEPRECIATION:
        if age <= max_age:
            return rate
    return None  # blocked

def calculate_duty(crsp, year):
    age  = CURRENT_YEAR - year
    depr = get_depreciation(age)
    if depr is None:
        return None

    pre_depr    = crsp / DIVISOR
    cv          = pre_depr * (1 - depr)
    import_duty = cv * 0.25
    excise_duty = (cv + import_duty) * 0.20
    vat         = (cv + import_duty + excise_duty) * 0.16
    idf         = max(cv * 0.0225, 5000)
    rdl         = cv * 0.015
    total       = import_duty + excise_duty + vat + idf + rdl

    return {
        "cv":          round(cv),
        "import_duty": round(import_duty),
        "excise_duty": round(excise_duty),
        "vat":         round(vat),
        "idf":         round(idf),
        "rdl":         round(rdl),
        "total":       round(total),
        "depr_pct":    int(depr * 100),
        "age":         age,
    }

# ── Slugify ───────────────────────────────────────────────────────────────

def slugify(s):
    s = str(s).lower()
    s = re.sub(r"[^a-z0-9\s-]", "", s)
    s = re.sub(r"[\s]+", "-", s.strip())
    s = re.sub(r"-+", "-", s)
    return s

# ── KES format ────────────────────────────────────────────────────────────

def kes(n):
    return f"KES {int(n):,}"

# ── HTML page template ────────────────────────────────────────────────────

def make_page(category, make, model_obj, css_path, js_path):
    model   = model_obj["model"]
    crsp    = model_obj["crsp"]
    cc      = model_obj.get("cc")
    fuel    = model_obj.get("fuel", "")
    tx      = model_obj.get("tx", "")

    title_car = f"{make} {model}"
    meta_desc = (
        f"Calculate KRA import duty for a {title_car} in Kenya. "
        f"Uses official CRSP July 2025 value of {kes(crsp)}. "
        f"Step-by-step breakdown for all valid import years."
    )
    meta_kw = (
        f"{title_car.lower()} import duty kenya, "
        f"{title_car.lower()} kra duty, "
        f"{title_car.lower()} duty calculator kenya 2025"
    )

    # Build duty table rows for all valid years
    table_rows = []
    for yr in range(CURRENT_YEAR, CURRENT_YEAR - MAX_AGE - 1, -1):
        d = calculate_duty(crsp, yr)
        if d is None:
            continue
        age_label = f"New" if d["age"] == 0 else f"{d['age']} yr{'s' if d['age'] != 1 else ''}"
        row = f"""
        <tr class="border-t border-border hover:bg-surface-2 transition-colors">
          <td class="px-4 py-3 font-semibold text-text">{yr}</td>
          <td class="px-4 py-3 text-text-muted text-sm">{age_label}</td>
          <td class="px-4 py-3 text-text-muted text-sm">{d['depr_pct']}%</td>
          <td class="px-4 py-3 text-text text-sm">{kes(d['cv'])}</td>
          <td class="px-4 py-3 font-bold text-amber">{kes(d['total'])}</td>
        </tr>"""
        table_rows.append(row)

    table_html = "\n".join(table_rows)

    # Vehicle meta tags for display
    meta_parts = [x for x in [
        f"{cc}cc" if isinstance(cc, int) else cc,
        fuel.title() if fuel else None,
        tx,
        category,
    ] if x]
    meta_str = " · ".join(meta_parts)

    # Best year (lowest duty, which is newest = least depreciation taken off,
    # but also smallest CV... actually newest has LEAST depreciation = HIGHEST CV = highest duty.
    # The "cheapest to import" is the oldest valid year (most depreciation).
    cheapest_year = CURRENT_YEAR - MAX_AGE
    cheapest_d    = calculate_duty(crsp, cheapest_year)
    cheapest_kes  = kes(cheapest_d["total"]) if cheapest_d else "N/A"

    return f"""<!DOCTYPE html>
<html lang="en-KE">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title_car} Import Duty Kenya 2025 — CarDuty</title>
  <meta name="description" content="{meta_desc}" />
  <meta name="keywords" content="{meta_kw}" />
  <link rel="canonical" href="https://carduty.co.ke/duty/{slugify(category)}/{slugify(make)}/{slugify(model)}/" />

  <meta property="og:title"       content="{title_car} KRA Import Duty 2025" />
  <meta property="og:description" content="CRSP value: {kes(crsp)} · Duty from {cheapest_kes} depending on year" />
  <meta property="og:url"         content="https://carduty.co.ke/duty/{slugify(category)}/{slugify(make)}/{slugify(model)}/" />

  <!-- Schema: HowTo for rich snippets -->
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to calculate KRA import duty for {title_car}",
    "description": "Step-by-step KRA duty calculation for {title_car} using official CRSP July 2025",
    "step": [
      {{"@type": "HowToStep", "name": "Find CRSP value",   "text": "CRSP value is {kes(crsp)} per the official KRA July 2025 list"}},
      {{"@type": "HowToStep", "name": "Strip built-in taxes", "text": "Divide CRSP by 2.4469 to get pre-depreciation customs value"}},
      {{"@type": "HowToStep", "name": "Apply depreciation", "text": "Depreciation ranges from 0% (new) to 65% (8 years old) based on year of manufacture"}},
      {{"@type": "HowToStep", "name": "Calculate duties",   "text": "Apply: Import Duty 25%, Excise Duty 20%, VAT 16%, IDF 2.25%, RDL 1.5%"}}
    ]
  }}
  </script>

  <link rel="stylesheet" href="{css_path}" />
</head>

<body class="bg-bg text-text min-h-screen">

  <!-- Header -->
  <header class="bg-charcoal border-b border-border-2 sticky top-0 z-40">
    <div class="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3">
        <div class="w-8 h-8 bg-amber rounded-lg flex items-center justify-center flex-shrink-0">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <span class="font-bold text-white text-base tracking-tight">CarDuty</span>
      </a>
      <a href="/" class="text-xs text-amber hover:underline">← Calculator</a>
    </div>
  </header>

  <main class="max-w-3xl mx-auto px-4 py-6 space-y-5">

    <!-- Breadcrumb -->
    <nav class="text-xs text-text-muted flex items-center gap-1.5 flex-wrap">
      <a href="/" class="hover:text-amber transition-colors">Home</a>
      <span>›</span>
      <a href="/duty/{slugify(category)}/" class="hover:text-amber transition-colors">{category}</a>
      <span>›</span>
      <a href="/duty/{slugify(category)}/{slugify(make)}/" class="hover:text-amber transition-colors">{make}</a>
      <span>›</span>
      <span class="text-text">{model}</span>
    </nav>

    <!-- Vehicle header -->
    <section class="bg-charcoal rounded-2xl px-5 py-6 border border-border-2">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-text-muted text-xs uppercase tracking-widest mb-1">{category}</p>
          <h1 class="text-2xl font-bold text-white leading-tight">{title_car}</h1>
          <p class="text-text-muted text-sm mt-1">{meta_str}</p>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="text-text-subtle text-xs">CRSP Value</p>
          <p class="text-xl font-bold text-amber">{kes(crsp)}</p>
          <p class="text-text-subtle text-xs mt-0.5">July 2025</p>
        </div>
      </div>
    </section>

    <!-- Duty table -->
    <section class="bg-surface border border-border rounded-2xl overflow-hidden">
      <div class="px-5 py-4 border-b border-border">
        <h2 class="font-semibold text-base">KRA Duty by Year of Manufacture</h2>
        <p class="text-text-muted text-xs mt-0.5">
          Pre-calculated for all valid import years. Cars manufactured before {CURRENT_YEAR - MAX_AGE} cannot be imported under Kenya's 8-year rule.
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
              <th class="px-4 py-2.5 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">Total KRA Duty</th>
            </tr>
          </thead>
          <tbody>
            {table_html}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Formula card -->
    <section class="bg-surface border border-border rounded-2xl px-5 py-4">
      <h3 class="font-semibold text-sm mb-3">How we calculated this</h3>
      <div class="bg-surface-2 border border-border rounded-xl px-4 py-3 font-mono text-xs text-text-muted space-y-1 leading-relaxed">
        <div>CRSP ({kes(crsp)}) <span class="text-text-subtle">÷ 2.4469</span> = pre-depreciation value</div>
        <div>× (1 − depreciation rate) = <strong class="text-text">Customs Value (CV)</strong></div>
        <div class="border-t border-border pt-1.5 mt-1.5"></div>
        <div>CV × 25% = Import Duty</div>
        <div>(CV + ID) × 20% = Excise Duty</div>
        <div>(CV + ID + ED) × 16% = VAT</div>
        <div>CV × 2.25% = IDF (min KES 5,000)</div>
        <div>CV × 1.5% = RDL</div>
      </div>
    </section>

    <!-- CTA -->
    <div class="bg-amber/10 border border-amber/30 rounded-2xl px-5 py-5 text-center">
      <p class="font-bold text-text mb-1">Want to compare other cars?</p>
      <p class="text-text-muted text-sm mb-3">Use our full interactive calculator with 5,200+ vehicles from the KRA CRSP July 2025 list.</p>
      <a href="/" class="inline-block bg-amber text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-amber-dark transition-colors">
        Open Calculator →
      </a>
    </div>

    <footer class="text-center text-xs text-text-subtle pb-8 space-y-1">
      <p>Data: KRA CRSP July 2025 · Rates: Finance Act 2025</p>
      <p>For guidance only. Verify with KRA or a licensed clearing agent.</p>
    </footer>

  </main>

</body>
</html>"""

# ── Main ──────────────────────────────────────────────────────────────────

def main():
    data = json.loads(CASCADE_FILE.read_text())
    css_path, js_path = get_assets()

    out_dir = DIST_DIR / "duty"
    out_dir.mkdir(parents=True, exist_ok=True)

    total    = 0
    skipped  = 0

    for category, makes in data["data"].items():
        cat_slug = slugify(category)
        for make, models in makes.items():
            make_slug = slugify(make)
            for i, model_obj in enumerate(models):
                model_slug = slugify(model_obj["model"])
                # Handle duplicate model slugs within same make
                if not model_slug:
                    model_slug = f"model-{i}"

                page_dir = out_dir / cat_slug / make_slug / model_slug
                page_dir.mkdir(parents=True, exist_ok=True)

                # If dir already exists from a duplicate slug, append index
                out_file = page_dir / "index.html"
                if out_file.exists():
                    page_dir = out_dir / cat_slug / make_slug / f"{model_slug}-{i}"
                    page_dir.mkdir(parents=True, exist_ok=True)
                    out_file = page_dir / "index.html"

                html = make_page(category, make, model_obj, css_path, js_path)
                out_file.write_text(html, encoding="utf-8")
                total += 1

    print(f"Generated {total} vehicle pages → dist/duty/")
    print(f"Skipped:   {skipped}")
    print(f"CSS:       {css_path}")

if __name__ == "__main__":
    main()
