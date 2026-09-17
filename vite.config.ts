import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          build: {
            // font-list resolves an internal file relative to its own
            // package location at runtime; inlining it into main.js would
            // break that lookup, so it must stay a real require() instead.
            // Vite 8 bundles via Rolldown, whose external option lives
            // under `rolldownOptions`, not the classic `rollupOptions`.
            rolldownOptions: { external: ["font-list"] },
          },
        },
      },
      preload: {
        input: "electron/preload.ts",
      },
    }),
  ],
});
