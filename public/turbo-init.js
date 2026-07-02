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
        (function (ins) {
          // When the unit resolves, hide its whole wrapper (incl. the
          // "Advertisement" label) if AdSense returned no ad ("unfilled"),
          // so we never show an empty labelled box.
          var obs = new MutationObserver(function () {
            var status = ins.getAttribute("data-ad-status");
            if (!status) return;
            if (status === "unfilled") {
              var wrap = ins.closest("[data-ad-wrapper]");
              if (wrap) wrap.style.display = "none";
            }
            obs.disconnect();
          });
          obs.observe(ins, { attributes: true, attributeFilter: ["data-ad-status"] });
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        })(units[i]);
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
