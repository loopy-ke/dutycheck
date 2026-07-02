/**
 * Turbo Drive glue — plain browser script (NOT a module).
 * Runs on every page. Sends a GA page_view on each Turbo visit, because
 * gtag's automatic page_view only fires on the initial hard load.
 */
(function () {
  document.addEventListener("turbo:load", function () {
    if (typeof gtag === "function") {
      gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_location: location.href,
        page_title: document.title,
      });
    }
  });
})();
