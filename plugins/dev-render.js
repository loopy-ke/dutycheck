/**
 * Vite plugin: on-the-fly page rendering in dev mode.
 *
 * Intercepts requests matching /:category/, /:category/:make/, /:category/:make/:model/
 * and returns fully-rendered HTML — no pre-generation needed.
 */

import { renderUrl } from "./render.js";

export function devRenderPlugin() {
  return {
    name: "carduty-dev-render",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Only handle GET requests with clean paths (no assets, api, etc.)
        const url = req.url?.split("?")[0] ?? "/";
        if (!url.endsWith("/") && !url.match(/^\/[^.]+$/)) return next();
        if (url.startsWith("/@") || url.startsWith("/src/") || url.startsWith("/data/") || url.startsWith("/css/")) {
          return next();
        }

        // Try to render the URL
        try {
          const html = renderUrl(url);
          if (!html) return next(); // not our route — let Vite handle it

          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.statusCode = 200;
          res.end(html);
        } catch (err) {
          console.error("[carduty-dev-render] Error rendering", url, err);
          next(err);
        }
      });
    },
  };
}
