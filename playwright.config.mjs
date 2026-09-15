import { defineConfig } from "@playwright/test";
import { createServer } from "node:net";

const inheritedPort = Number(process.env.PNQ_E2E_PORT);
const port = inheritedPort || await new Promise((resolve, reject) => {
  const probe = createServer();
  probe.unref();
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const address = probe.address();
    probe.close((error) => error ? reject(error) : resolve(address.port));
  });
});
process.env.PNQ_E2E_PORT = String(port);

const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "tests/e2e",
  use: {
    baseURL
  },
  webServer: {
    command: "npm run build && node scripts/serve.mjs",
    env: { PORT: String(port) },
    url: `${baseURL}/`,
    reuseExistingServer: false,
    timeout: 120000
  }
});
