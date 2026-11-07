import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// base "./" keeps every asset path relative, so the build works under
// https://<user>.github.io/otamasing-broadcast-compact/ without knowing the repo name.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  // flag SVGs stay separate files (loaded only when used) instead of being inlined into the JS bundle
  build: { assetsInlineLimit: 0 },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node" },
});
