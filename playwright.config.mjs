import { defineConfig } from "@playwright/test";

const chromiumPath = process.env.DK_CHROMIUM_PATH;
const baseURL = "http://127.0.0.1:" + (process.env.DK_TEST_PORT || 4173);

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 320, height: 820 },
        ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
      },
    },
    {
      name: "webkit-mobile",
      testMatch: /(?:catalog|daily|pdf-tools|calculators|layout)\.spec\.mjs$/,
      use: {
        browserName: "webkit",
        viewport: { width: 320, height: 820 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "node tests/browser/server.mjs",
    url: baseURL,
    reuseExistingServer: false,
  },
});
