/**
 * Dark / light mode toggle.
 * Persists preference in localStorage. Defaults to system preference.
 */
export function initTheme() {
  const html   = document.documentElement;
  const toggle = document.getElementById("theme-toggle");
  const sunIcon  = document.getElementById("icon-sun");
  const moonIcon = document.getElementById("icon-moon");

  function isDark() {
    return html.classList.contains("dark");
  }

  function applyTheme(dark) {
    if (dark) {
      html.classList.add("dark");
      sunIcon.classList.remove("hidden");
      moonIcon.classList.add("hidden");
    } else {
      html.classList.remove("dark");
      sunIcon.classList.add("hidden");
      moonIcon.classList.remove("hidden");
    }
  }

  // Load saved preference, fall back to system
  const saved = localStorage.getItem("theme");
  if (saved) {
    applyTheme(saved === "dark");
  } else {
    applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  toggle.addEventListener("click", () => {
    const next = !isDark();
    applyTheme(next);
    localStorage.setItem("theme", next ? "dark" : "light");
  });
}
