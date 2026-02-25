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
const BASE_URL   = "https://dutycheck.co.ke";
const LASTMOD    = new Date().toISOString().slice(0, 10); // build date

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

// ── Sitemap helpers ──────────────────────────────────────────────────────────

function urlEntry(loc, priority = "0.5", changefreq = "monthly") {
  return `  <url>\n    <loc>${BASE_URL}${loc}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function writeSitemap(filename, entries) {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");
  writeFileSync(`${OUT_DIR}/${filename}`, xml);
}

// Sitemap index entries (one per category sitemap + the main sitemap)
const sitemapIndexEntries = [];

// ── Page + sitemap generation ────────────────────────────────────────────────

// Main sitemap: homepage + category pages
const mainUrls = [urlEntry("/", "1.0", "weekly")];

for (const category of crsp.categories) {
  const catSlug = slugify(category);
  const catDir  = `${OUT_DIR}/${catSlug}`;
  mkdirSync(catDir, { recursive: true });

  const html = renderUrl(`/${catSlug}/`);
  if (html) { writeFileSync(`${catDir}/index.html`, html); count++; }

  mainUrls.push(urlEntry(`/${catSlug}/`, "0.8", "monthly"));

  // Per-category sitemap: make + model + year pages
  const catUrls = [];

  for (const [make, models] of Object.entries(crsp.data[category])) {
    const makeSlug = slugify(make);
    const makeDir  = `${catDir}/${makeSlug}`;
    mkdirSync(makeDir, { recursive: true });

    const makeHtml = renderUrl(`/${catSlug}/${makeSlug}/`);
    if (makeHtml) { writeFileSync(`${makeDir}/index.html`, makeHtml); count++; }

    catUrls.push(urlEntry(`/${catSlug}/${makeSlug}/`, "0.7", "monthly"));

    for (const m of buildModelIndex(models)) {
      const modelDir = `${makeDir}/${m.slug}`;
      mkdirSync(modelDir, { recursive: true });

      const modelHtml = renderUrl(`/${catSlug}/${makeSlug}/${m.slug}/`);
      if (modelHtml) { writeFileSync(`${modelDir}/index.html`, modelHtml); count++; }

      catUrls.push(urlEntry(`/${catSlug}/${makeSlug}/${m.slug}/`, "0.6", "monthly"));

      // Year pages: one per valid import year
      for (let yr = CURR_YEAR; yr >= CURR_YEAR - MAX_AGE; yr--) {
        const yearDir = `${modelDir}/${yr}`;
        mkdirSync(yearDir, { recursive: true });
        const yearHtml = renderUrl(`/${catSlug}/${makeSlug}/${m.slug}/${yr}/`);
        if (yearHtml) { writeFileSync(`${yearDir}/index.html`, yearHtml); count++; }

        catUrls.push(urlEntry(`/${catSlug}/${makeSlug}/${m.slug}/${yr}/`, "0.5", "yearly"));
      }
    }
  }

  const sitemapName = `sitemap-${catSlug}.xml`;
  writeSitemap(sitemapName, catUrls);
  sitemapIndexEntries.push(
    `  <sitemap>\n    <loc>${BASE_URL}/${sitemapName}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n  </sitemap>`
  );
}

// Write main sitemap
writeSitemap("sitemap.xml", mainUrls);

// Write sitemap index
const sitemapIndex = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  `  <sitemap>\n    <loc>${BASE_URL}/sitemap.xml</loc>\n    <lastmod>${LASTMOD}</lastmod>\n  </sitemap>`,
  ...sitemapIndexEntries,
  "</sitemapindex>",
].join("\n");
writeFileSync(`${OUT_DIR}/sitemap-index.xml`, sitemapIndex);

console.log(`Generated ${count} pages + ${1 + sitemapIndexEntries.length + 1} sitemaps → dist/`);
