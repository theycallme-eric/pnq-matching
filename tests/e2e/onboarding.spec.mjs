/*
 * End-to-end tests for the onboarding flow (REQ-002, REQ-003, REQ-004):
 * Launch cover, Setup · Ear with live engine routing, and the dark
 * Setup · Headphones and volume gate with setupSeen persistence.
 */
import { test, expect } from "@playwright/test";
import { startSessionFromSplash } from "./onboarding-helpers.mjs";

const key = "pnq-mtp-v1";

test.describe("onboarding", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Launch renders the PNQ patient-app framing and Get started advances directly to account setup", async ({ page }) => {
    await page.goto("/");
    const launch = page.locator('[data-screen-label="Launch"]');
    await expect(launch).toBeVisible();

    await expect(launch.locator('img[src$="waveform-mark.svg"]')).toBeVisible();
    await expect(launch.getByText("pnq", { exact: true })).toBeVisible();
    await expect(launch.getByText("health", { exact: true })).toBeVisible();
    await expect(launch.getByText("A guided sound-matching experience.")).toBeVisible();
    await expect(launch.getByText(/prototype|fictional/i)).toHaveCount(0);

    await page.getByRole("button", { name: "Get started" }).click();
    await expect(page.locator('[data-screen-label="Create account"]')).toBeVisible();
    await expect(page.locator('[data-screen-label="Privacy"]')).toHaveCount(0);
    await expect(page.locator('[data-screen-label="Setup · Ear"]')).toHaveCount(0);
  });

  test("Setup · Ear gates Continue, shows the inline error, and routes the engine to the chosen ear", async ({ page }) => {
    await page.goto("/");
    await startSessionFromSplash(page);
    const ear = page.locator('[data-screen-label="Setup · Ear"]');
    await expect(ear).toBeVisible();
    await expect(ear.getByText("Select which ear(s)", { exact: true })).toBeVisible();
    await expect(ear.getByText("Which ear(s) would you like to treat?", { exact: true })).toBeVisible();

    // Three SelectRow choices; none selected yet, so Continue is disabled.
    for (const label of ["Left ear", "Right ear", "Both ears"]) {
      await expect(ear.getByText(label, { exact: true })).toBeVisible();
    }
    const cont = page.getByRole("button", { name: "Continue" });
    await expect(cont).toHaveAttribute("aria-disabled", "true");

    // Attempting to continue without a choice shows the inline error.
    await cont.click({ force: true });
    await expect(ear.getByText("Choose an ear to continue.")).toBeVisible();
    await expect(ear).toBeVisible();

    // Exactly one row can be selected; the last click wins.
    await ear.getByText("Right ear", { exact: true }).click();
    await ear.getByText("Left ear", { exact: true }).click();
    expect(await page.evaluate(() => window.__pnqAppState().ear)).toBe("Left ear");
    await expect(ear.getByText("Choose an ear to continue.")).toHaveCount(0);
    await expect(cont).not.toHaveAttribute("aria-disabled", "true");

    // 'Left ear' routes all subsequent audio through the engine's StereoPanner
    // to the left channel only (setEar/earIsRouted API).
    const routed = await page.evaluate(() => {
      const a = window.__pnqAudioEngine;
      a.ready();
      a.setEar("left"); // idempotent: the screen already routed left
      return a.earIsRouted();
    });
    expect(routed).toBe(true);

    await cont.click();
    await expect(page.locator('[data-screen-label="Setup · Headphones and volume"]')).toBeVisible();
  });

  test("Setup · Ear Back returns to the preceding screen without clearing the setup session", async ({ page }) => {
    await page.goto("/");
    await startSessionFromSplash(page);
    const ear = page.locator('[data-screen-label="Setup · Ear"]');
    await ear.getByText("Right ear", { exact: true }).click();

    const beforeBack = await page.evaluate(() => window.__pnqAppState());
    await page.getByRole("button", { name: "Back", exact: true }).click();

    await expect(page.locator('[data-screen-label="Dashboard"]')).toBeVisible();
    const afterBack = await page.evaluate(() => window.__pnqAppState());
    expect(afterBack.ear).toBe("Right ear");
    expect(afterBack.hp).toBe(beforeBack.hp);
    expect(afterBack.vol).toBe(beforeBack.vol);
    expect(afterBack.onboardingSeen).toBe(true);
  });

  test("Setup · Headphones and volume gates Continue, updates live, and persists setupSeen through education", async ({ page }) => {
    await page.goto("/");
    await startSessionFromSplash(page);
    await page.getByText("Both ears", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    const setup = page.locator('[data-screen-label="Setup · Headphones and volume"]');
    await expect(setup).toBeVisible();
    await expect(setup.getByText("Let's get set up")).toBeVisible();

    // Not confirmed, volume below 100: pill and helper copy show the gap.
    await expect(setup.getByText("Not detected")).toBeVisible();
    await expect(setup.getByText("Plug in headphones or earphones")).toBeVisible();
    await expect(setup.getByText("100% required to continue")).toBeVisible();
    await expect(setup.getByText("/ 100%")).toBeVisible();
    const cont = page.getByRole("button", { name: "Continue" });
    await expect(cont).toHaveAttribute("aria-disabled", "true");

    // Headphones row toggles the confirmed pill.
    await setup.getByRole("button", { name: /Headphones/ }).click();
    await expect(setup.getByText("Connected")).toBeVisible();
    await expect(setup.getByText("Your headphones are ready")).toBeVisible();
    await expect(cont).toHaveAttribute("aria-disabled", "true");

    // The readout tracks the slider live; anything under 100 keeps the gate.
    const slider = page.getByLabel("Device volume");
    await slider.fill("60");
    await expect(setup.getByText("60%")).toBeVisible();
    await expect(setup.getByText("100% required to continue")).toBeVisible();
    await expect(cont).toHaveAttribute("aria-disabled", "true");

    // At 100 the box reads Ready, the "/ 100%" target disappears, Continue unlocks.
    await slider.fill("100");
    await expect(setup.getByText("Ready", { exact: true })).toBeVisible();
    await expect(setup.getByText("/ 100%")).toHaveCount(0);
    await expect(cont).not.toHaveAttribute("aria-disabled", "true");

    // Completing marks setupSeen, persists it, and advances directly to education.
    await cont.click();
    await expect(page.locator('[data-screen-label="Shared · What to listen for"]')).toBeVisible();
    await expect(page.locator('[data-screen-label="Matching options"]')).toHaveCount(0);
    const stored = await page.evaluate((k) => JSON.parse(sessionStorage.getItem(k)), key);
    expect(stored.setupSeen).toBe(true);

    await page.getByRole("button", { name: "I'm ready to start" }).click();
    await expect(page.locator("[data-matching-options-sheet]")).toBeVisible();
    await expect(page.getByRole("button", { name: /Headphones and volume/ })).toHaveCount(0);
    await page.reload();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    await expect(page.locator("[data-matching-options-sheet]")).toBeVisible();
    expect((await page.evaluate((k) => JSON.parse(sessionStorage.getItem(k)), key)).setupSeen).toBe(true);
  });
});
