import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { devRenderPlugin } from "./plugins/dev-render.js";

export default defineConfig({
  plugins: [
    tailwindcss(),
    devRenderPlugin(),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
