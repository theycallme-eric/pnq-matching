/*
 * End-to-end tests for the home hub (REQ-005): the priming gate on the three
 * neutral Option rows, Done pills with completion-order tracking, and the ear
 * segmented control re-routing audio without leaving the hub.
 */
import { test, expect } from "@playwright/test";

const hub = (page) => page.locator('[data-screen-label="Matching options"]');
// Substring name match: a completed row's accessible name is "Option N Done".
const option = (page, n) => page.getByRole("button", { name: "Option " + n });

async function reachUnprimedHub(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByText("Both ears", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator('[data-screen-label="Setup · Headphones and volume"]')).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(hub(page)).toBeVisible();
}

async function completeDeviceSetup(page) {
  await page.getByRole("button", { name: "Headphones and volume" }).click();
  await expect(page.locator('[data-screen-label="Setup · Headphones and volume"]')).toBeVisible();
  await page.getByRole("button", { name: /Headphones Plug in/ }).click();
  await page.getByLabel("Device volume").fill("100");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(hub(page)).toBeVisible();
}

async function completeEdu(page) {
  await page.getByRole("button", { name: "What to listen for" }).click();
  await expect(page.locator('[data-screen-label="Shared · What to listen for"]')).toBeVisible();
  await page.getByRole("button", { name: "I'm ready to start" }).click();
  await expect(hub(page)).toBeVisible();
}

// Walks a generic flow to Match complete and returns to the hub. Each stage's
// Continue is heard-gated (REQ-018), so play the sound before advancing.
async function completeOption(page, n, continues) {
  await option(page, n).click();
  await expect(hub(page)).toHaveCount(0);
  for (let i = 0; i < continues; i++) {
    await page.getByRole("button", { name: "Play the sound" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.getByText("Fairly close").click();
  await page.getByRole("button", { name: "Finish matching" }).click();
  await expect(page.locator('[data-screen-label="Shared · Match complete"]')).toBeVisible();
  await page.getByRole("button", { name: "Return to matching options" }).click();
  await expect(hub(page)).toBeVisible();
}

test.describe("home hub", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("home hub keeps the option rows aria-disabled until setupSeen and eduSeen are both true", async ({ page }) => {
    await reachUnprimedHub(page);

    // Locked: aria-disabled plus the non-interactive styling on all three rows.
    for (const n of [1, 2, 3]) {
      const row = option(page, n);
      await expect(row).toHaveAttribute("aria-disabled", "true");
      await expect(row).toHaveCSS("cursor", "not-allowed");
      await expect(row).toHaveCSS("box-shadow", "none");
    }
    const lockedBg = await option(page, 1).evaluate((el) => getComputedStyle(el).backgroundColor);

    // Clicking a locked row does not open its flow. force bypasses
    // Playwright's own aria-disabled actionability check so the app's guard
    // is what gets exercised.
    await option(page, 1).click({ force: true });
    await expect(hub(page)).toBeVisible();
    expect(await page.evaluate(() => window.__pnqAppState().screen)).toBe("home");

    // One flag alone is not enough: still locked after device setup only.
    await completeDeviceSetup(page);
    await expect(option(page, 2)).toHaveAttribute("aria-disabled", "true");
    await option(page, 2).click({ force: true });
    await expect(hub(page)).toBeVisible();

    // Both flags true: aria-disabled drops and enabled styling flips in.
    await completeEdu(page);
    for (const n of [1, 2, 3]) {
      const row = option(page, n);
      await expect(row).not.toHaveAttribute("aria-disabled", /.*/);
      await expect(row).toHaveCSS("cursor", "pointer");
      await expect(row).not.toHaveCSS("box-shadow", "none");
    }
    expect(await option(page, 1).evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(lockedBg);

    // An enabled row opens its flow.
    await option(page, 1).click();
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();
  });

  test("home hub shows only neutral participant-facing labels", async ({ page }) => {
    await reachUnprimedHub(page);
    await expect(option(page, 1)).toBeVisible();
    await expect(option(page, 2)).toBeVisible();
    await expect(option(page, 3)).toBeVisible();
    // No internal concept names or research language anywhere on the hub.
    const text = await page.locator("[data-device-frame]").innerText();
    expect(text).not.toMatch(/Narrowing|Comparison|Adaptive|Families|2D|Field|Longitudinal|concept|hypothes|research/i);
  });

  test("home hub earns Done pills and tracks completion order", async ({ page }) => {
    await reachUnprimedHub(page);
    await expect(page.getByText("Done", { exact: true })).toHaveCount(0);

    // Each setup row earns its gray check pill after being visited.
    await completeDeviceSetup(page);
    await expect(page.getByRole("button", { name: "Headphones and volume" }).getByText("Done")).toBeVisible();
    await completeEdu(page);
    const eduRow = page.getByRole("button", { name: "What to listen for" });
    await expect(eduRow.getByText("Done")).toBeVisible();
    await expect(eduRow.locator("svg")).toHaveCount(2); // check pill + chevron

    // Complete Option 2 first, then Option 1: pills appear per option and
    // optDone/optOrder record what completed, in order.
    await completeOption(page, 2, 2); // r: dir -> comp -> conf
    await expect(option(page, 2).getByText("Done")).toBeVisible();
    await expect(option(page, 1).getByText("Done")).toHaveCount(0);
    await completeOption(page, 1, 4); // n: vol -> p1 -> p2 -> p3 -> conf
    await expect(option(page, 1).getByText("Done")).toBeVisible();

    const st = await page.evaluate(() => window.__pnqAppState());
    expect(st.optOrder).toEqual(["r", "n"]);
    expect(Object.keys(st.optDone).sort()).toEqual(["n", "r"]);
    expect(st.optDone.r).toBe("Fairly close");
  });

  test("home hub ear control re-routes the engine without leaving the hub", async ({ page }) => {
    // Record every StereoPanner the engine builds so routing is observable.
    await page.addInitScript(() => {
      const orig = AudioContext.prototype.createStereoPanner;
      window.__panners = [];
      AudioContext.prototype.createStereoPanner = function (...args) {
        const p = orig.apply(this, args);
        window.__panners.push(p);
        return p;
      };
    });
    await reachUnprimedHub(page);

    await page.getByRole("button", { name: "Left", exact: true }).click();
    await expect(hub(page)).toBeVisible(); // no navigation
    expect(await page.evaluate(() => window.__pnqAppState().ear)).toBe("Left ear");

    // First playback builds the graph already routed to the chosen ear.
    expect(await page.evaluate(() => window.__pnqAudioEngine.play("probe", [{ kind: "tone", pitch: 0.5, level: 0.3 }]))).toBe(true);
    expect(await page.evaluate(() => window.__pnqAudioEngine.earIsRouted())).toBe(true);
    expect(await page.evaluate(() => window.__panners[0].pan.value)).toBe(-1);

    // Switching ears re-routes the engine, still without leaving the hub.
    await page.getByRole("button", { name: "Right", exact: true }).click();
    await expect(hub(page)).toBeVisible();
    expect(await page.evaluate(() => window.__pnqAppState().ear)).toBe("Right ear");
    // panic() rebuilds the output graph from the engine's current ear, so the
    // fresh panner's pan value reads the routing deterministically (the live
    // panner ramps via setTargetAtTime, which stalls while a headless context
    // is suspended).
    const pan = await page.evaluate(() => {
      const eng = window.__pnqAudioEngine;
      eng.panic();
      eng.play("probe2", [{ kind: "tone", pitch: 0.5, level: 0.3 }]);
      return window.__panners[window.__panners.length - 1].pan.value;
    });
    expect(pan).toBe(1);
    await page.evaluate(() => window.__pnqAudioEngine.stop());
  });
});
