import "./style.css";
import { initTheme } from "./theme.js";
import { initCalculator } from "./calculator.js";

function boot() {
  initTheme();
  initCalculator();
}

// Initial hard load of the homepage (this module only ships on the homepage).
boot();

// Re-run on every Turbo Drive visit. Turbo swaps <body> without re-executing
// head module scripts, so this listener — registered once and living for the
// life of the JS runtime — is what re-hydrates the calculator/theme when the
// user navigates back to the homepage. Both inits are idempotent + no-ops when
// their mount DOM is absent, so this is safe on generated pages too.
document.addEventListener("turbo:load", boot);
