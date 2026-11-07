import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:4173/", trace: "retain-on-failure" },
  // WebGL falls back to SwiftShader (the 3D course); the page itself stays on software compositing (--use-angle=swiftshader
  // would composite through SwiftShader too, which stalls full-screen clip-path transitions for seconds).
  // Sound may start without a click, like OBS's browser source.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions: { args: ["--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required"] } } }],
  webServer: { command: "npm run build && npm run preview", url: "http://localhost:4173/", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
