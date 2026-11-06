import { defineConfig, devices } from "@playwright/test"

const PORT = 4317

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  expect: { timeout: 8_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // Uses the locally installed Chrome; run `npx playwright install chromium` to use the bundled browser instead.
    channel: process.env.PW_CHANNEL ?? "chrome",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    // Tests run against the production build: closer to what ships and free of dev-compile latency.
    command: `npx vite build && npx vite preview --port ${PORT} --strictPort`,
    timeout: 120_000,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
})
