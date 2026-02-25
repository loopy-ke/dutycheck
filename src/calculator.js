/**
 * DutyCheck — KRA Import Duty Calculator
 * Cascade: Vehicle Type → Make → Model → Year → auto-calculate
 * Uses only safe DOM methods (no innerHTML with data).
 */

// ── Constants ─────────────────────────────────────────────────────────────

const CURRENT_YEAR = 2026;
const MAX_AGE      = 8;
const DIVISOR      = 2.4469;

const DEPRECIATION = [
  { maxAge: 1, rate: 0.00 },
  { maxAge: 2, rate: 0.20 },
  { maxAge: 3, rate: 0.30 },
  { maxAge: 4, rate: 0.40 },
  { maxAge: 5, rate: 0.50 },
  { maxAge: 6, rate: 0.55 },
  { maxAge: 7, rate: 0.60 },
  { maxAge: 8, rate: 0.65 },
];

const CATEGORY_ICONS = {
  "Motorcycle":     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3"/><circle cx="18.5" cy="17.5" r="3"/><path d="M8.5 17.5h7M9 17.5V11l3-5h3l2 4-4 1v4"/><circle cx="16" cy="6" r="1"/></svg>`,
  "SUV":            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="9" width="22" height="9" rx="2"/><path d="M4 9V6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v3"/><circle cx="7" cy="18.5" r="1.5"/><circle cx="17" cy="18.5" r="1.5"/><path d="M5 9h14"/></svg>`,
  "Sedan":          `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17H3a1 1 0 0 1-1-1v-4a1 1 0 0 1 .3-.7l3-3A1 1 0 0 1 6 8h12a1 1 0 0 1 .7.3l3 3a1 1 0 0 1 .3.7v4a1 1 0 0 1-1 1h-2"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/><path d="M6 8l2-4h8l2 4"/></svg>`,
  "Hatchback":      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 .6-1.4l2.4-2.4A2 2 0 0 1 7.4 8H16l3 3v4a2 2 0 0 1-2 2h-2"/><circle cx="9" cy="17" r="2"/><circle cx="16" cy="17" r="2"/><path d="M7 8V5h8v3"/></svg>`,
  "Station Wagon":  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="9" width="22" height="8" rx="2"/><path d="M5 9V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/><circle cx="6.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/><path d="M9 9V5M15 9V5"/></svg>`,
  "Van":            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="7" width="16" height="11" rx="2"/><path d="M17 11h2l3 4v2h-5"/><circle cx="6" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M1 11h16"/></svg>`,
  "Pickup / Truck": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4l4 3v6a2 2 0 0 1-2 2z"/><path d="M14 18h4a2 2 0 0 0 2-2v-3l-3-4h-3"/><circle cx="8" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>`,
  "Coupe":          `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17H1v-3l2-5h14l4 5v3h-2"/><path d="M3 9l2-4h10l2 4"/><circle cx="6" cy="17" r="2"/><circle cx="18" cy="17" r="2"/></svg>`,
  "Convertible":    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17H2v-4l4-5h12l2 5v4h-2"/><path d="M6 8V6h12v2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M2 13h20"/></svg>`,
  "Bus":            `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M2 12h20M2 8h20M7 18v2M17 18v2"/><circle cx="7" cy="15" r="1"/><circle cx="17" cy="15" r="1"/></svg>`,
  "Commercial":     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="8" width="13" height="10" rx="1"/><path d="M14 11h4l3 4v3h-7V11z"/><circle cx="5" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M1 13h13"/></svg>`,
};

// ── Helpers ───────────────────────────────────────────────────────────────

const kes = (n) => "KES " + Math.round(n).toLocaleString("en-KE");
const pct = (r)  => (r * 100).toFixed(0) + "%";

function getDepreciation(age) {
  for (const tier of DEPRECIATION) {
    if (age <= tier.maxAge) return tier.rate;
  }
  return null;
}

function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function el(tag, { cls, text } = {}) {
  const e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (text) e.textContent = text;
  return e;
}

// ── DOM refs ──────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const categoryGrid    = $("category-grid");
const stepMake        = $("step-make");
const makeGrid        = $("make-grid");
const stepModel       = $("step-model");
const modelGrid       = $("model-grid");
const stepYear        = $("step-year");
const yearGrid        = $("year-grid");
const eightYearNotice = $("eight-year-notice");
const cutoffLabel     = $("cutoff-label");
const yearNote        = $("year-note");
const ageLabel        = $("age-label");
const deprLabel       = $("depr-label");
const results         = $("results");
const rTotal          = $("r-total");
const rSummary        = $("r-summary");
const breakdown       = $("breakdown");
const shareBtn        = $("share-btn");
const recalcBtn       = $("recalc-btn");

// ── Slugify (mirrors plugins/render.js) ───────────────────────────────────

function slugify(s) {
  return String(s).toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// ── Collapsible section helpers ───────────────────────────────────────────

function collapseSection(id, summary) {
  const body = $(`${id}-body`);
  const val  = $(`${id}-val`);
  const chg  = $(`${id}-chg`);
  const hdr  = $(`${id}-hdr`);
  if (body) body.classList.add("hidden");
  if (val)  { val.textContent = summary; val.classList.remove("hidden"); }
  if (chg)  chg.classList.remove("hidden");
  if (hdr)  hdr.classList.remove("border-b");
}

function expandSection(id) {
  const body = $(`${id}-body`);
  const val  = $(`${id}-val`);
  const chg  = $(`${id}-chg`);
  const hdr  = $(`${id}-hdr`);
  if (body) body.classList.remove("hidden");
  if (val)  val.classList.add("hidden");
  if (chg)  chg.classList.add("hidden");
  if (hdr)  hdr.classList.add("border-b");
}

// ── State ─────────────────────────────────────────────────────────────────

let crspData      = null;
let selectedCat   = null;
let selectedMake  = null;
let selectedModel = null;
let selectedYear  = null;
let shareText     = "";

// ── Boot ──────────────────────────────────────────────────────────────────

export async function initCalculator() {
  const res = await fetch("/data/crsp_cascade.json");
  crspData  = await res.json();
  renderCategories();
  shareBtn.addEventListener("click", share);
  recalcBtn.addEventListener("click", recalculate);
}

function updatePath() {
  const parts = [];
  if (selectedCat)   parts.push(slugify(selectedCat));
  if (selectedMake)  parts.push(slugify(selectedMake));
  if (selectedModel) parts.push(slugify(selectedModel.model));
  if (selectedYear)  parts.push(String(selectedYear));
  const path = parts.length ? "/" + parts.join("/") + "/" : "/";
  history.replaceState(null, "", path);
}

// ── Step 1: Categories ────────────────────────────────────────────────────

function parseSvg(svgStr) {
  // "text/html" is lenient about namespaces; SVG without xmlns parses fine
  const parser = new DOMParser();
  const doc    = parser.parseFromString(svgStr, "text/html");
  const svg    = doc.body.firstElementChild;
  if (!svg) return document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "w-6 h-6");
  return document.importNode(svg, true);
}

function renderCategories() {
  clear(categoryGrid);

  for (const cat of crspData.categories) {
    const catSlug = slugify(cat);

    const btn = document.createElement("button");
    btn.dataset.catSlug = catSlug;
    btn.className = [
      "flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 text-xs font-medium transition-all",
      "border-border bg-surface-2 text-text-muted",
      "hover:border-amber hover:bg-amber/10 hover:text-amber",
    ].join(" ");

    const iconWrap = document.createElement("div");
    iconWrap.className = "w-6 h-6 flex items-center justify-center";
    iconWrap.appendChild(parseSvg(CATEGORY_ICONS[cat] || CATEGORY_ICONS["Sedan"]));

    btn.appendChild(iconWrap);
    btn.appendChild(el("span", { cls: "text-center leading-tight", text: cat }));
    btn.addEventListener("click", () => selectCategory(cat, btn));
    categoryGrid.appendChild(btn);
  }

  // Wire up "Change" button for category step
  const chgBtn = $("step-cat-chg");
  if (chgBtn) {
    chgBtn.addEventListener("click", () => {
      expandSection("step-cat");
      // Reset downstream
      selectedCat = selectedMake = selectedModel = selectedYear = null;
      hide(stepMake, stepModel, stepYear, results);
      updatePath();
      // Deselect all category buttons
      categoryGrid.querySelectorAll("button").forEach(b => {
        b.classList.remove("border-amber", "bg-amber/10", "text-amber");
        b.classList.add("border-border", "bg-surface-2", "text-text-muted");
      });
    });
  }
}

function selectCategory(cat, activeBtn) {
  selectedCat  = cat;
  selectedMake = selectedModel = selectedYear = null;

  categoryGrid.querySelectorAll("button").forEach(b => {
    b.classList.remove("border-amber", "bg-amber/10", "text-amber");
    b.classList.add("border-border", "bg-surface-2", "text-text-muted");
  });
  activeBtn.classList.remove("border-border", "bg-surface-2", "text-text-muted");
  activeBtn.classList.add("border-amber", "bg-amber/10", "text-amber");

  // Render make chips
  clear(makeGrid);
  Object.keys(crspData.data[cat]).sort().forEach(make => {
    const chip = el("button", {
      cls:  "px-4 py-1.5 rounded-full border-2 text-sm font-medium transition-all border-border bg-surface-2 text-text-muted hover:border-amber hover:bg-amber/10 hover:text-amber",
      text: make,
    });
    chip.addEventListener("click", () => selectMake(make, chip));
    makeGrid.appendChild(chip);
  });

  // Wire "Change" for make step
  const makeChg = $("step-make-chg");
  if (makeChg) {
    makeChg.onclick = () => {
      expandSection("step-make");
      selectedMake = selectedModel = selectedYear = null;
      hide(stepModel, stepYear, results);
      makeGrid.querySelectorAll("button").forEach(b => {
        b.classList.remove("border-amber", "bg-amber/10", "text-amber");
        b.classList.add("border-border", "bg-surface-2", "text-text-muted");
      });
      updatePath();
    };
  }

  collapseSection("step-cat", cat);
  hide(stepModel, stepYear, results);
  show(stepMake);
  expandSection("step-make");
  scrollSmooth(stepMake);
  updatePath();
}

// ── Step 2: Make ──────────────────────────────────────────────────────────

function selectMake(make, activeChip) {
  selectedMake  = make;
  selectedModel = selectedYear = null;

  makeGrid.querySelectorAll("button").forEach(b => {
    b.classList.remove("border-amber", "bg-amber/10", "text-amber");
    b.classList.add("border-border", "bg-surface-2", "text-text-muted");
  });
  activeChip.classList.remove("border-border", "bg-surface-2", "text-text-muted");
  activeChip.classList.add("border-amber", "bg-amber/10", "text-amber");

  // Render model chips
  const models = crspData.data[selectedCat][make];
  clear(modelGrid);
  models.forEach(m => {
    const chip = document.createElement("button");
    chip.className = [
      "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all",
      "border-border bg-surface-2 hover:border-amber hover:bg-amber/10",
    ].join(" ");

    const leftDiv = document.createElement("div");
    leftDiv.className = "min-w-0";
    leftDiv.appendChild(el("p", { cls: "font-semibold text-sm text-text", text: m.model }));
    const parts = [
      m.cc ? (typeof m.cc === "number" ? m.cc + "cc" : String(m.cc)) : null,
      m.fuel,
      m.tx,
    ].filter(Boolean);
    if (parts.length) {
      leftDiv.appendChild(el("p", { cls: "text-xs text-text-muted mt-0.5", text: parts.join(" · ") }));
    }

    const rightDiv = document.createElement("div");
    rightDiv.className = "text-right flex-shrink-0";
    rightDiv.appendChild(el("p", { cls: "text-text-subtle text-xs", text: "CRSP" }));
    rightDiv.appendChild(el("p", { cls: "font-bold text-amber text-sm", text: kes(m.crsp) }));

    chip.appendChild(leftDiv);
    chip.appendChild(rightDiv);
    chip.addEventListener("click", () => selectModel(m, chip));
    modelGrid.appendChild(chip);
  });

  // Wire "Change" for model step
  const modelChg = $("step-model-chg");
  if (modelChg) {
    modelChg.onclick = () => {
      expandSection("step-model");
      selectedModel = selectedYear = null;
      hide(stepYear, results);
      modelGrid.querySelectorAll("button").forEach(b => {
        b.classList.remove("border-amber", "bg-amber/10");
        b.classList.add("border-border");
      });
      updatePath();
    };
  }

  collapseSection("step-make", make);
  hide(stepYear, results);
  show(stepModel);
  expandSection("step-model");
  scrollSmooth(stepModel);
  updatePath();
}

// ── Step 3: Model ─────────────────────────────────────────────────────────

function selectModel(model, activeChip) {
  selectedModel = model;
  selectedYear  = null;

  modelGrid.querySelectorAll("button").forEach(b => {
    b.classList.remove("border-amber", "bg-amber/10");
    b.classList.add("border-border");
  });
  activeChip.classList.remove("border-border");
  activeChip.classList.add("border-amber", "bg-amber/10");

  // Wire "Change" for year step
  const yearChg = $("step-year-chg");
  if (yearChg) {
    yearChg.onclick = () => {
      expandSection("step-year");
      selectedYear = null;
      hide(results);
      yearGrid.querySelectorAll("button:not(:disabled)").forEach(b => {
        b.classList.remove("border-amber", "bg-amber/10", "text-amber");
        b.classList.add("border-border", "bg-surface-2", "text-text");
      });
      yearNote.classList.add("hidden");
    };
  }

  const modelLabel = model.model + (model.cc ? ` · ${typeof model.cc === "number" ? model.cc + "cc" : model.cc}` : "");
  collapseSection("step-model", modelLabel);
  updatePath();
  renderYearGrid();
  hide(results);
  show(stepYear);
  expandSection("step-year");
  scrollSmooth(stepYear);
}

// ── Step 4: Year ──────────────────────────────────────────────────────────

function renderYearGrid() {
  clear(yearGrid);
  eightYearNotice.classList.add("hidden");
  yearNote.classList.add("hidden");

  const cutoff = CURRENT_YEAR - MAX_AGE;
  cutoffLabel.textContent = cutoff;

  for (let yr = CURRENT_YEAR; yr >= cutoff - 2; yr--) {
    const age     = CURRENT_YEAR - yr;
    const blocked = age > MAX_AGE;

    const btn = el("button", { text: String(yr) });
    btn.disabled  = blocked;
    btn.className = [
      "py-2.5 rounded-xl text-sm font-semibold transition-all border-2",
      blocked
        ? "border-border bg-surface-2 text-text-subtle cursor-not-allowed line-through opacity-40"
        : "border-border bg-surface-2 text-text hover:border-amber hover:bg-amber/10 hover:text-amber",
    ].join(" ");

    if (!blocked) btn.addEventListener("click", () => selectYear(yr, btn));
    yearGrid.appendChild(btn);
  }
}

function selectYear(year, activeBtn) {
  selectedYear = year;
  const age  = CURRENT_YEAR - year;
  const rate = getDepreciation(age);

  yearGrid.querySelectorAll("button:not(:disabled)").forEach(b => {
    b.classList.remove("border-amber", "bg-amber/10", "text-amber");
    b.classList.add("border-border", "bg-surface-2", "text-text");
  });
  activeBtn.classList.remove("border-border", "bg-surface-2", "text-text");
  activeBtn.classList.add("border-amber", "bg-amber/10", "text-amber");

  ageLabel.textContent  = age === 0 ? "Under 1 year (new)" : `${age} year${age !== 1 ? "s" : ""}`;
  deprLabel.textContent = pct(rate);
  yearNote.classList.remove("hidden");

  updatePath();
  collapseSection("step-year", `${year} · ${age === 0 ? "New" : age + "yr"} · ${pct(rate)} depr`);
  calculate();
}

// ── Calculate ─────────────────────────────────────────────────────────────

function calculate() {
  const crsp       = selectedModel.crsp;
  const age        = CURRENT_YEAR - selectedYear;
  const depr       = getDepreciation(age);
  const preDepr    = crsp / DIVISOR;
  const cv         = preDepr * (1 - depr);
  const importDuty = cv * 0.25;
  const exciseDuty = (cv + importDuty) * 0.20;
  const vat        = (cv + importDuty + exciseDuty) * 0.16;
  const idf        = Math.max(cv * 0.0225, 5000);
  const rdl        = cv * 0.015;
  const total      = importDuty + exciseDuty + vat + idf + rdl;

  rTotal.textContent   = kes(total);
  rSummary.textContent = `${selectedMake} ${selectedModel.model} · ${selectedYear} · ${selectedCat}`;

  clear(breakdown);

  const steps = [
    { label: "CRSP Value",                  note: "Official KRA CRSP July 2025",                                  formula: null,                                        value: crsp,       style: "normal"    },
    { label: "÷ 2.4469",                    note: "KRA valuation factor → pre-depreciation base",                 formula: `${kes(crsp)} ÷ 2.4469`,                     value: preDepr,    style: "normal"    },
    { label: `− ${pct(depr)} depreciation`, note: `${age} year${age !== 1 ? "s" : ""} old · direct import`,      formula: `${kes(preDepr)} × ${(1 - depr).toFixed(2)}`, value: cv,         style: "highlight" },
    { label: "Import Duty (25%)",           note: "Customs Value × 25%",                                          formula: `${kes(cv)} × 0.25`,                         value: importDuty, style: "normal"    },
    { label: "Excise Duty (20%)",           note: "(CV + Import Duty) × 20%",                                     formula: `${kes(cv + importDuty)} × 0.20`,            value: exciseDuty, style: "normal"    },
    { label: "VAT (16%)",                   note: "(CV + ID + Excise) × 16%",                                     formula: `${kes(cv + importDuty + exciseDuty)} × 0.16`, value: vat,      style: "normal"    },
    { label: "IDF (2.25%)",                 note: `CV × 2.25%${idf === 5000 ? " · min KES 5,000 applied" : ""}`, formula: `${kes(cv)} × 0.0225`,                       value: idf,        style: "normal"    },
    { label: "RDL (1.5%)",                  note: "Railway Development Levy",                                      formula: `${kes(cv)} × 0.015`,                        value: rdl,        style: "normal"    },
    { label: "Total KRA Duty",              note: "Import Duty + Excise + VAT + IDF + RDL",                       formula: null,                                        value: total,      style: "total"     },
  ];

  steps.forEach(s => breakdown.appendChild(makeBreakdownRow(s)));

  shareText = buildShareText(total, cv, importDuty, exciseDuty, vat, idf, rdl);
  results.classList.remove("hidden");
  results.classList.add("fade-up");
  scrollSmooth(results);
}

function makeBreakdownRow({ label, note, formula, value, style }) {
  const row = document.createElement("div");
  if (style === "total") {
    row.className = "px-5 py-4 bg-charcoal";
  } else if (style === "highlight") {
    row.className = "px-5 py-3.5 bg-amber/5 border-l-2 border-amber";
  } else {
    row.className = "px-5 py-3.5";
  }

  const isTotal = style === "total";

  const metaDiv = document.createElement("div");
  metaDiv.className = "flex-1 min-w-0";
  metaDiv.appendChild(el("p", {
    cls:  `font-semibold text-sm ${isTotal ? "text-white" : "text-text"}`,
    text: label,
  }));
  metaDiv.appendChild(el("p", {
    cls:  `text-xs mt-0.5 ${isTotal ? "text-text-subtle" : "text-text-muted"}`,
    text: note,
  }));
  if (formula) {
    metaDiv.appendChild(el("p", {
      cls:  "text-xs mt-0.5 font-mono text-text-subtle",
      text: formula,
    }));
  }

  const valueEl = el("p", {
    cls: [
      "font-bold flex-shrink-0",
      isTotal               ? "text-white text-lg"  :
      style === "highlight" ? "text-amber"           :
                              "text-text",
    ].join(" "),
    text: kes(value),
  });

  const wrapper = document.createElement("div");
  wrapper.className = "flex items-start justify-between gap-3";
  wrapper.appendChild(metaDiv);
  wrapper.appendChild(valueEl);
  row.appendChild(wrapper);
  return row;
}

// ── Share ─────────────────────────────────────────────────────────────────

function buildShareText(total, cv, id, ed, vat, idf, rdl) {
  const car = `${selectedMake} ${selectedModel.model} (${selectedYear})`;
  return [
    `🚗 *DutyCheck KRA Calculator*`,
    ``,
    `*${car}*`,
    `CRSP: ${kes(selectedModel.crsp)}`,
    `Customs Value: ${kes(cv)}`,
    ``,
    `Import Duty:  ${kes(id)}`,
    `Excise Duty:  ${kes(ed)}`,
    `VAT:          ${kes(vat)}`,
    `IDF + RDL:    ${kes(idf + rdl)}`,
    ``,
    `*Total KRA Duty: ${kes(total)}*`,
    ``,
    `Calculate yours 👉 https://dutycheck.co.ke`,
  ].join("\n");
}

function share() {
  window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
}

// ── Recalculate ───────────────────────────────────────────────────────────

function recalculate() {
  // Reset all state and collapse all steps back to start
  selectedCat = selectedMake = selectedModel = selectedYear = null;
  hide(stepMake, stepModel, stepYear, results);
  expandSection("step-cat");
  categoryGrid.querySelectorAll("button").forEach(b => {
    b.classList.remove("border-amber", "bg-amber/10", "text-amber");
    b.classList.add("border-border", "bg-surface-2", "text-text-muted");
  });
  yearNote.classList.add("hidden");
  updatePath();
  scrollSmooth(categoryGrid);
}

// ── Utils ─────────────────────────────────────────────────────────────────

function show(...els) { els.forEach(e => e.classList.remove("hidden")); }
function hide(...els) { els.forEach(e => e.classList.add("hidden")); }
function scrollSmooth(e) { e.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
