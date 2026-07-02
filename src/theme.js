/**
 * Dark / light mode toggle.
 * Persists preference in localStorage. Defaults to system preference.
 *
 * Safe to call repeatedly (e.g. on every Turbo visit): it always re-applies the
 * saved theme to <html>, and only binds the toggle handler once per DOM.
 */
export function initTheme() {
  const html     = document.documentElement;
  const toggle   = document.getElementById("theme-toggle");
  const sunIcon  = document.getElementById("icon-sun");
  const moonIcon = document.getElementById("icon-moon");

  function applyTheme(dark) {
    if (dark) html.classList.add("dark");
    else html.classList.remove("dark");
    if (sunIcon)  sunIcon.classList.toggle("hidden", !dark);
    if (moonIcon) moonIcon.classList.toggle("hidden", dark);
  }

  // Resolve preference: saved > system.
  const saved = localStorage.getItem("theme");
  const dark  = saved ? saved === "dark"
                      : window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(dark);

  // Pages without the calculator (generated SEO pages) have no toggle button.
  if (!toggle) return;
  if (toggle.dataset.dcInit === "1") return; // already bound for this DOM
  toggle.dataset.dcInit = "1";

  toggle.addEventListener("click", () => {
    const next = !html.classList.contains("dark");
    applyTheme(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  });
}
