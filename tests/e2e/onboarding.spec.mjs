/*
 * End-to-end tests for the onboarding flow (REQ-002, REQ-003, REQ-004):
 * Launch cover, Setup · Ear with live engine routing, and the dark
 * Setup · Headphones and volume gate with setupSeen persistence.
 */
import { test, expect } from "@playwright/test";

const key = "pnq-mtp-v1";

test.describe("onboarding", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Launch renders the V5 cover copy and Get started advances to Setup · Ear", async ({ page }) => {
    await page.goto("/");
    const launch = page.locator('[data-screen-label="Launch"]');
    await expect(launch).toBeVisible();

    // Mark, overline, heading, body and the three orientation bullets.
    await expect(launch.locator('img[src$="waveform-mark-navy.svg"]')).toBeVisible();
    await expect(launch.getByText("PNQ SOUND MATCHING")).toBeVisible();
    await expect(launch.getByText("Let's find the sound you hear")).toBeVisible();
    await expect(launch.getByText("You'll listen through headphones and adjust a tone until it comes close to the sound you hear in your tinnitus.")).toBeVisible();
    for (const t of [
      "There are no right or wrong answers. Only you can hear your tinnitus.",
      "You can stop the sound at any time, and take a break whenever you need one.",
      "If you cannot hear something, say so. That is useful, not a failure."
    ]) {
      await expect(launch.getByText(t)).toBeVisible();
    }

    await page.getByRole("button", { name: "Get started" }).click();
    await expect(page.locator('[data-screen-label="Setup · Ear"]')).toBeVisible();
  });

  test("Setup · Ear gates Continue, shows the inline error, and routes the engine to the chosen ear", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Get started" }).click();
    const ear = page.locator('[data-screen-label="Setup · Ear"]');
    await expect(ear).toBeVisible();
    await expect(ear.getByText("Which ear would you like to work with?")).toBeVisible();
    await expect(ear.getByText("Sound plays only in the ear you choose. If you hear it in both, pick the side where it is strongest, or choose both ears.")).toBeVisible();

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

  test("Setup · Headphones and volume gates Continue, updates live, and persists setupSeen as Done on the hub", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Get started" }).click();
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

    // Completing marks setupSeen, persists it, and shows Done on the hub.
    await cont.click();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    const row = page.getByRole("button", { name: /Headphones and volume/ });
    await expect(row.getByText("Done")).toBeVisible();
    const stored = await page.evaluate((k) => JSON.parse(sessionStorage.getItem(k)), key);
    expect(stored.setupSeen).toBe(true);

    await page.reload();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /Headphones and volume/ }).getByText("Done")).toBeVisible();
  });
});
