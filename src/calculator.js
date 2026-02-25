/**
 * CarDuty — KRA Import Duty Calculator
 * Cascade: Vehicle Type → Make → Model → Year → Calculate
 * Uses only safe DOM methods (no innerHTML).
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
  "Motorcycle":     "🏍️",
  "SUV":            "🚙",
  "Sedan":          "🚗",
  "Hatchback":      "🚘",
  "Station Wagon":  "🚐",
  "Van":            "🚌",
  "Pickup / Truck": "🛻",
  "Coupe":          "🏎️",
  "Convertible":    "🚘",
  "Bus":            "🚍",
  "Commercial":     "🚛",
};

// ── Helpers ───────────────────────────────────────────────────────────────

const kes = (n) => "KES " + Math.round(n).toLocaleString("en-KE");
const pct = (r)  => (r * 100).toFixed(0) + "%";

function getDepreciation(age) {
  for (const tier of DEPRECIATION) {
    if (age <= tier.maxAge) return tier.rate;
  }
  return null; // > 8 years → blocked
}

/** Remove all children from an element */
function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Create a DOM element with optional class and text content */
function el(tag, { cls, text } = {}) {
  const e = document.createElement(tag);
  if (cls)  e.className   = cls;
  if (text) e.textContent = text;
  return e;
}

/** Create a reset <option> element */
function resetOption(text) {
  const opt = el("option", { text });
  opt.value = "";
  return opt;
}

// ── DOM refs ──────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const categoryGrid    = $("category-grid");
const stepMake        = $("step-make");
const makeSelect      = $("make-select");
const stepModel       = $("step-model");
const modelSelect     = $("model-select");
const vehicleCard     = $("vehicle-card");
const vcName          = $("vc-name");
const vcMeta          = $("vc-meta");
const vcCrsp          = $("vc-crsp");
const stepYear        = $("step-year");
const yearGrid        = $("year-grid");
const eightYearNotice = $("eight-year-notice");
const cutoffLabel     = $("cutoff-label");
const yearNote        = $("year-note");
const ageLabel        = $("age-label");
const deprLabel       = $("depr-label");
const calcWrap        = $("calc-wrap");
const calcBtn         = $("calc-btn");
const results         = $("results");
const rTotal          = $("r-total");
const rSummary        = $("r-summary");
const breakdown       = $("breakdown");
const shareBtn        = $("share-btn");
const recalcBtn       = $("recalc-btn");

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
  calcBtn.addEventListener("click", calculate);
  shareBtn.addEventListener("click", share);
  recalcBtn.addEventListener("click", recalculate);
  makeSelect.addEventListener("change", onMakeChange);
  modelSelect.addEventListener("change", onModelChange);
}

// ── Step 1: Categories ────────────────────────────────────────────────────

function renderCategories() {
  clear(categoryGrid);

  for (const cat of crspData.categories) {
    const btn = document.createElement("button");
    btn.className = [
      "flex flex-col items-center gap-1 px-2 py-3 rounded-xl border-2 text-xs font-medium transition-all",
      "border-border bg-surface-2 text-text-muted",
      "hover:border-amber hover:bg-amber/10 hover:text-amber",
    ].join(" ");

    const iconSpan  = el("span", { cls: "text-2xl leading-none", text: CATEGORY_ICONS[cat] || "🚗" });
    const labelSpan = el("span", { cls: "text-center leading-tight", text: cat });

    btn.appendChild(iconSpan);
    btn.appendChild(labelSpan);
    btn.addEventListener("click", () => selectCategory(cat, btn));
    categoryGrid.appendChild(btn);
  }
}

function selectCategory(cat, activeBtn) {
  selectedCat = cat;
  selectedMake = selectedModel = selectedYear = null;

  categoryGrid.querySelectorAll("button").forEach(b => {
    b.classList.remove("border-amber", "bg-amber/10", "text-amber");
    b.classList.add("border-border", "bg-surface-2", "text-text-muted");
  });
  activeBtn.classList.remove("border-border", "bg-surface-2", "text-text-muted");
  activeBtn.classList.add("border-amber", "bg-amber/10", "text-amber");

  clear(makeSelect);
  makeSelect.appendChild(resetOption("— Select make —"));
  Object.keys(crspData.data[cat]).sort().forEach(make => {
    const opt = el("option", { text: make });
    opt.value = make;
    makeSelect.appendChild(opt);
  });
  makeSelect.value = "";

  clear(modelSelect);
  modelSelect.appendChild(resetOption("— Select model —"));
  vehicleCard.classList.add("hidden");
  hide(stepModel, stepYear, calcWrap, results);
  show(stepMake);
  scrollSmooth(stepMake);
}

// ── Step 2: Make ──────────────────────────────────────────────────────────

function onMakeChange() {
  selectedMake  = makeSelect.value || null;
  selectedModel = selectedYear = null;
  vehicleCard.classList.add("hidden");
  hide(stepModel, stepYear, calcWrap, results);
  if (!selectedMake) return;

  const models = crspData.data[selectedCat][selectedMake];
  clear(modelSelect);
  modelSelect.appendChild(resetOption("— Select model —"));
  models.forEach((m, i) => {
    const parts = [
      m.cc   ? (typeof m.cc === "number" ? m.cc + "cc" : String(m.cc)) : null,
      m.fuel,
      m.tx,
    ].filter(Boolean);
    const label = m.model + (parts.length ? ` (${parts.join(" · ")})` : "");
    const opt   = el("option", { text: label });
    opt.value = i;
    modelSelect.appendChild(opt);
  });
  modelSelect.value = "";

  show(stepModel);
  scrollSmooth(stepModel);
}

// ── Step 3: Model ─────────────────────────────────────────────────────────

function onModelChange() {
  selectedYear = null;
  hide(stepYear, calcWrap, results);

  const idx = modelSelect.value;
  if (!idx) {
    vehicleCard.classList.add("hidden");
    selectedModel = null;
    return;
  }

  selectedModel = crspData.data[selectedCat][selectedMake][parseInt(idx)];

  vcName.textContent = `${selectedMake} ${selectedModel.model}`;
  vcMeta.textContent = [
    selectedModel.cc ? (typeof selectedModel.cc === "number" ? selectedModel.cc + "cc" : String(selectedModel.cc)) : null,
    selectedModel.fuel,
    selectedModel.tx,
    selectedCat,
  ].filter(Boolean).join(" · ");
  vcCrsp.textContent = kes(selectedModel.crsp);
  vehicleCard.classList.remove("hidden");

  renderYearGrid();
  show(stepYear);
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
  eightYearNotice.classList.add("hidden");

  show(calcWrap);
  scrollSmooth(calcWrap);
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
    { label: "CRSP Value",                 note: "Official KRA CRSP July 2025",                             formula: null,                               value: crsp,       style: "normal" },
    { label: "÷ 2.4469",                   note: "Strips built-in taxes → pre-depreciation value",          formula: `${kes(crsp)} ÷ 2.4469`,            value: preDepr,    style: "normal" },
    { label: `− ${pct(depr)} depreciation`,note: `${age} year${age !== 1 ? "s" : ""} old · direct import`, formula: `${kes(preDepr)} × ${(1-depr).toFixed(2)}`, value: cv, style: "highlight" },
    { label: "Import Duty (25%)",          note: "Customs Value × 25%",                                     formula: `${kes(cv)} × 0.25`,                value: importDuty, style: "normal" },
    { label: "Excise Duty (20%)",          note: "(CV + Import Duty) × 20%",                                formula: `${kes(cv + importDuty)} × 0.20`,   value: exciseDuty, style: "normal" },
    { label: "VAT (16%)",                  note: "(CV + ID + Excise) × 16%",                                formula: `${kes(cv + importDuty + exciseDuty)} × 0.16`, value: vat, style: "normal" },
    { label: "IDF (2.25%)",                note: `CV × 2.25%${idf === 5000 ? " · min KES 5,000 applied" : ""}`, formula: `${kes(cv)} × 0.0225`,         value: idf,        style: "normal" },
    { label: "RDL (1.5%)",                 note: "Railway Development Levy",                                formula: `${kes(cv)} × 0.015`,               value: rdl,        style: "normal" },
    { label: "Total KRA Duty",             note: "Import Duty + Excise + VAT + IDF + RDL",                 formula: null,                               value: total,      style: "total" },
  ];

  steps.forEach(s => breakdown.appendChild(makeBreakdownRow(s)));

  shareText = buildShareText(total, cv, importDuty, exciseDuty, vat, idf, rdl);
  hide(calcWrap);
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

  const labelEl = el("p", {
    cls:  `font-semibold text-sm ${isTotal ? "text-white" : "text-text"}`,
    text: label,
  });
  const noteEl = el("p", {
    cls:  `text-xs mt-0.5 ${isTotal ? "text-text-subtle" : "text-text-muted"}`,
    text: note,
  });

  const metaDiv = document.createElement("div");
  metaDiv.className = "flex-1 min-w-0";
  metaDiv.appendChild(labelEl);
  metaDiv.appendChild(noteEl);

  if (formula) {
    const fEl = el("p", {
      cls:  "text-xs mt-0.5 font-mono text-text-subtle",
      text: formula,
    });
    metaDiv.appendChild(fEl);
  }

  const valueEl = el("p", {
    cls: [
      "font-bold flex-shrink-0",
      isTotal             ? "text-white text-lg" :
      style === "highlight" ? "text-amber"          :
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
    `🚗 *CarDuty KRA Calculator*`,
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
    `Calculate yours 👉 https://carduty.co.ke`,
  ].join("\n");
}

function share() {
  window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
}

// ── Recalculate ───────────────────────────────────────────────────────────

function recalculate() {
  selectedYear = null;
  hide(results);
  show(calcWrap);
  yearGrid.querySelectorAll("button:not(:disabled)").forEach(b => {
    b.classList.remove("border-amber", "bg-amber/10", "text-amber");
    b.classList.add("border-border", "bg-surface-2", "text-text");
  });
  yearNote.classList.add("hidden");
  scrollSmooth(stepYear);
}

// ── Utils ─────────────────────────────────────────────────────────────────

function show(...els) { els.forEach(e => e.classList.remove("hidden")); }
function hide(...els) { els.forEach(e => e.classList.add("hidden")); }
function scrollSmooth(e) { e.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
