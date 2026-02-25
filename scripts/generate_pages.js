/**
 * Prod static page generator — uses the same renderer as dev SSR.
 * Writes all pages into dist/ after Vite build.
 *
 * Run: node scripts/generate_pages.js
 * Called by: npm run build (after vite build)
 */

import { mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import { slugify, renderUrl } from "../plugins/render.js";

const ROOT       = new URL("..", import.meta.url).pathname;
const OUT_DIR    = resolve(ROOT, "dist");
const CURR_YEAR  = 2026;
const MAX_AGE    = 8;

// Load CRSP data
import { readFileSync } from "fs";
const crsp = JSON.parse(readFileSync(resolve(ROOT, "data/crsp_cascade.json"), "utf-8"));

function buildModelIndex(models) {
  const seen = {};
  return models.map((m, i) => {
    let slug = slugify(m.model) || `model-${i}`;
    if (seen[slug] !== undefined) slug = `${slug}-${i}`;
    seen[slug] = i;
    return { ...m, slug };
  });
}

let count = 0;

for (const category of crsp.categories) {
  const catSlug = slugify(category);
  const catDir  = `${OUT_DIR}/${catSlug}`;
  mkdirSync(catDir, { recursive: true });

  const html = renderUrl(`/${catSlug}/`);
  if (html) { writeFileSync(`${catDir}/index.html`, html); count++; }

  for (const [make, models] of Object.entries(crsp.data[category])) {
    const makeSlug = slugify(make);
    const makeDir  = `${catDir}/${makeSlug}`;
    mkdirSync(makeDir, { recursive: true });

    const makeHtml = renderUrl(`/${catSlug}/${makeSlug}/`);
    if (makeHtml) { writeFileSync(`${makeDir}/index.html`, makeHtml); count++; }

    for (const m of buildModelIndex(models)) {
      const modelDir = `${makeDir}/${m.slug}`;
      mkdirSync(modelDir, { recursive: true });

      const modelHtml = renderUrl(`/${catSlug}/${makeSlug}/${m.slug}/`);
      if (modelHtml) { writeFileSync(`${modelDir}/index.html`, modelHtml); count++; }

      // Year pages: one per valid import year
      for (let yr = CURR_YEAR; yr >= CURR_YEAR - MAX_AGE; yr--) {
        const yearDir = `${modelDir}/${yr}`;
        mkdirSync(yearDir, { recursive: true });
        const yearHtml = renderUrl(`/${catSlug}/${makeSlug}/${m.slug}/${yr}/`);
        if (yearHtml) { writeFileSync(`${yearDir}/index.html`, yearHtml); count++; }
      }
    }
  }
}

console.log(`Generated ${count} pages → dist/`);
