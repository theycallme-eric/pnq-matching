import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL: "http://127.0.0.1:4519"
  },
  webServer: {
    command: "npm run build && node scripts/serve.mjs",
    url: "http://127.0.0.1:4519/",
    reuseExistingServer: false,
    timeout: 120000
  }
});
