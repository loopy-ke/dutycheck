/**
 * Turbo Drive glue — plain browser script (NOT a module).
 * Runs on every page. Sends a GA page_view on each Turbo visit, because
 * gtag's automatic page_view only fires on the initial hard load.
 */
(function () {
  // Initialize any AdSense units that have not yet been filled. Turbo swaps
  // <body> on navigation, so we (re)run this on turbo:load. Only un-filled
  // <ins> elements (no data-adsbygoogle-status) are pushed, so filled units
  // are never double-pushed ("All ins elements already have ads").
  function initAds() {
    try {
      if (!window.adsbygoogle) return;
      var units = document.querySelectorAll("ins.adsbygoogle:not([data-adsbygoogle-status])");
      for (var i = 0; i < units.length; i++) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) { /* AdSense not ready — ignore */ }
  }

  initAds();

  document.addEventListener("turbo:load", function () {
    if (typeof gtag === "function") {
      gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_location: location.href,
        page_title: document.title,
      });
    }
    initAds();
  });
})();
