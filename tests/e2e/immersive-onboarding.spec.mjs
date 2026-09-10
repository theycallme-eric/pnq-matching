/*
 * Focused browser coverage for the patient-app onboarding
 * journey (REQ-001, REQ-002, REQ-003).
 */
import { test, expect } from "@playwright/test";

const storageKey = "pnq-mtp-v1";

test.use({ viewport: { width: 390, height: 844 } });

test("splash, prescription ID, and account confirmation reach the dashboard locally", async ({ page }) => {
  await page.addInitScript(() => {
    const calls = [];
    const storageWrites = [];
    const consoleEntries = [];
    window.__onboardingNetworkCalls = calls;
    window.__onboardingStorageWrites = storageWrites;
    window.__onboardingConsoleEntries = consoleEntries;

    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      storageWrites.push({
        area: this === localStorage ? "localStorage" : "sessionStorage",
        key: String(key),
        value: String(value)
      });
      return originalSetItem.call(this, key, value);
    };

    for (const method of ["log", "info", "debug", "warn", "error"]) {
      const original = console[method].bind(console);
      console[method] = (...args) => {
        consoleEntries.push(args.map(String).join(" "));
        original(...args);
      };
    }

    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      calls.push({ kind: "fetch", target: String(args[0]) });
      return originalFetch(...args);
    };

    const originalXhrSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (...args) {
      calls.push({ kind: "XMLHttpRequest", target: this.responseURL || "" });
      return originalXhrSend.apply(this, args);
    };

    const originalBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (...args) => {
      calls.push({ kind: "sendBeacon", target: String(args[0]) });
      return originalBeacon(...args);
    };

    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function (...args) {
      calls.push({ kind: "WebSocket", target: String(args[0]) });
      return new OriginalWebSocket(...args);
    };
    window.WebSocket.prototype = OriginalWebSocket.prototype;
  });

  await page.goto("/");

  const splash = page.locator('[data-screen-label="Launch"]');
  await expect(splash).toBeVisible();
  await expect(splash.getByText("pnq", { exact: true })).toBeVisible();
  await expect(splash.getByText("health", { exact: true })).toBeVisible();
  await expect(splash.getByRole("button", { name: "Get started" })).toBeVisible();
  await expect(page.locator('[data-screen-label="Dashboard"]')).toHaveCount(0);

  await splash.getByRole("button", { name: "Get started" }).click();
  let account = page.locator('[data-screen-label="Create account"]');
  await expect(page.locator('[data-screen-label="Privacy"]')).toHaveCount(0);
  await expect(account).toHaveAttribute("data-account-step", "entry");
  const identifier = account.getByRole("textbox", { name: "Prescription ID" });
  const accountContinue = account.getByRole("button", { name: "Continue" });
  await expect(identifier).toHaveValue("PNQ-4821-LK");
  await identifier.fill(" a ");
  await expect(accountContinue).toHaveAttribute("aria-disabled", "true");
  await expect(accountContinue).not.toHaveCSS("border-style", "dashed");
  await accountContinue.press("Enter");
  await expect(account).toHaveAttribute("data-account-step", "entry");
  await identifier.fill(" PNQ-9999 ");
  await expect(accountContinue).not.toHaveAttribute("aria-disabled", "true");

  // Account Back returns to Launch, drops the draft, and starts no audio.
  await account.getByRole("button", { name: "Back" }).click();
  await expect(splash).toBeVisible();
  expect(await page.evaluate(() => window.__pnqAppState().onboardingInput)).toBe("");
  expect(await page.evaluate(() => window.__pnqAppState().playKey)).toBeNull();

  await splash.getByRole("button", { name: "Get started" }).click();
  account = page.locator('[data-screen-label="Create account"]');
  await expect(account.getByRole("textbox", { name: "Prescription ID" })).toHaveValue("PNQ-4821-LK");
  await account.getByRole("textbox", { name: "Prescription ID" }).fill("PNQ-9999");
  await account.getByRole("button", { name: "Continue" }).click();

  await expect(account).toHaveAttribute("data-account-step", "confirmation");
  await expect(account.getByText("We found your record", { exact: true })).toBeVisible();
  await expect(account.getByText("John Doe", { exact: true })).toBeVisible();
  await expect(account.getByText("john.doe@email.com", { exact: true })).toBeVisible();
  await expect(account.getByRole("textbox")).toHaveCount(0);
  expect(await page.evaluate(() => window.__pnqAppState().onboardingInput)).toBe("");

  // The return action is immediate, local, and does not restore the entered ID.
  await account.getByRole("button", { name: "Use a different ID" }).click();
  await expect(account).toHaveAttribute("data-account-step", "entry");
  await expect(account.getByRole("textbox", { name: "Prescription ID" })).toHaveValue("PNQ-4821-LK");
  await account.getByRole("button", { name: "Continue" }).click();

  await account.getByRole("button", { name: "Yes, that's me" }).click();
  const dashboard = page.locator('[data-screen-label="Dashboard"]');
  await expect(dashboard).toBeVisible();
  await expect(dashboard.getByRole("button", { name: "New Session" })).toBeVisible();
  await expect(page.locator('[data-screen-label="Matching options"]')).toHaveCount(0);

  const observations = await page.evaluate((key) => ({
    calls: window.__onboardingNetworkCalls,
    writes: window.__onboardingStorageWrites,
    console: window.__onboardingConsoleEntries,
    local: JSON.stringify(localStorage),
    session: sessionStorage.getItem(key),
    url: location.href
  }), storageKey);
  expect(observations.calls).toEqual([]);
  for (const value of ["PNQ-9999", "John Doe", "john.doe@email.com", "+1 (401) 254-5010"]) {
    expect(JSON.stringify(observations.writes)).not.toContain(value);
    expect(JSON.stringify(observations.console)).not.toContain(value);
    expect(observations.local).not.toContain(value);
    expect(observations.session).not.toContain(value);
    expect(observations.url).not.toContain(value);
  }
  expect(JSON.parse(observations.session)).toEqual({
    onboardingSeen: true,
    earSeen: false,
    setupSeen: false,
    eduSeen: false,
    optDone: {},
    optOrder: []
  });
});
