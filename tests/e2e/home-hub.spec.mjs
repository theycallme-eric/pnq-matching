/*
 * Regression coverage for the former home hub. Matching options now render in
 * the shared two-step half-sheet while the established screen route and
 * internal completion accounting remain stable.
 */
import { test, expect } from "@playwright/test";
import { startSessionFromSplash } from "./onboarding-helpers.mjs";
import { auditApplicationParticipantStrings } from "../../src/app-copy.js";

const optionsScreen = (page) => page.locator('[data-screen-label="Matching options"]');
const sheet = (page) => page.locator("[data-matching-options-sheet]");
const selector = (page) => page.locator("[data-option-selector]");
const option = (page, number) => selector(page).locator(`[data-option-id="${number}"]`);
const optionCid = { 1: "n", 2: "r", 3: "d" };

async function reachReadyOptions(page) {
  await page.goto("/");
  await startSessionFromSplash(page);
  await page.getByText("Both ears", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Headphones Plug in/ }).click();
  await page.getByLabel("Device volume").fill("100");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator('[data-screen-label="Shared · What to listen for"]')).toBeVisible();
  await page.getByRole("button", { name: "I'm ready to start" }).click();
  await expect(sheet(page)).toBeVisible();
}

async function restoreReadyOptions(page) {
  await page.addInitScript(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
    onboardingSeen: true, earSeen: true, setupSeen: true, eduSeen: true, optDone: {}, optOrder: []
  })));
  await page.goto("/");
  await expect(sheet(page)).toBeVisible();
}

async function chooseOption(page, number) {
  await option(page, number).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(optionsScreen(page)).toHaveCount(0);
}

async function completeFromConfidence(page, number, concludes) {
  await chooseOption(page, number);
  await page.getByRole("button", { name: "Session menu" }).click();
  await page.getByRole("button", { name: "Jump to a different section" }).click();
  await page.getByRole("button", { name: "Confidence", exact: true }).nth(number - 1).click();
  await page.getByText("Fairly close", { exact: true }).click();
  await page.getByRole("button", { name: "Finish matching" }).click();

  const completion = page.locator('[data-screen-label="Shared · Match complete"]');
  await expect(completion).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
  await page.getByRole("button", {
    name: concludes ? "Finish session" : "Return to matching options"
  }).click();
  await expect(page.locator(`[data-screen-label="${concludes ? "Session complete" : "Matching options"}"]`)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
}

async function completeOption(page, number) {
  await chooseOption(page, number);
  if (number === 2) {
    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("button", { name: "The volume is set, move on" }).click();
    await page.getByRole("button", { name: "The pitch is set, finish up" }).click();
    await page.getByRole("button", { name: "The pitch is set, finish up" }).click();
    await page.getByRole("button", { name: "They sound the same" }).click();
  } else if (number === 1) {
    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("button", { name: "The volume is about right" }).click();
    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("button", { name: "Next: closer adjustments" }).click();
    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("button", { name: "Next: fine adjustments" }).click();
    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("button", { name: "This matches what I hear" }).click();
  } else {
    for (let level = 0; level < 3; level++) {
      await page.getByRole("button", { name: "Play the sound" }).click();
      await page.getByRole("button", { name: level < 2 ? "Look closely at this area" : "This sounds like my tinnitus" }).click();
    }
  }
  await page.getByText("Fairly close").click();
  await page.getByRole("button", { name: "Finish matching" }).click();
  await expect(page.locator('[data-screen-label="Shared · Match complete"]')).toBeVisible();
  await page.getByRole("button", { name: "Return to matching options" }).click();
  await expect(sheet(page)).toBeVisible();
}

test.describe("matching options route", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("appears only after the existing gates and requires explicit confirmation", async ({ page }) => {
    await page.goto("/");
    await startSessionFromSplash(page);
    await expect(sheet(page)).toHaveCount(0);
    await page.getByText("Both ears", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(sheet(page)).toHaveCount(0);
    await page.getByRole("button", { name: /Headphones Plug in/ }).click();
    await page.getByLabel("Device volume").fill("100");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(sheet(page)).toHaveCount(0);
    await page.getByRole("button", { name: "I'm ready to start" }).click();

    await expect(sheet(page)).toBeVisible();
    await expect(selector(page).getByRole("button")).toHaveCount(3);
    await expect(page.getByText("GETTING SET UP", { exact: true })).toHaveCount(0);
    const continueButton = page.getByRole("button", { name: "Continue", exact: true });
    await expect(continueButton).toBeDisabled();
    await option(page, 1).click();
    await expect(optionsScreen(page)).toBeVisible();
    await expect(option(page, 1)).toHaveAttribute("aria-pressed", "true");
    await expect(continueButton).toBeEnabled();
    await continueButton.click();
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();
  });

  test("shows only neutral participant-facing labels", async ({ page }) => {
    await reachReadyOptions(page);
    for (const number of [1, 2, 3]) await expect(option(page, number)).toBeVisible();
    const text = await sheet(page).innerText();
    expect(text).not.toMatch(/Narrowing|Comparison|Adaptive|Families|2D|Field|Longitudinal|concept|hypothes|method|approach|stage|winner|fallback|retry/i);
    expect(auditApplicationParticipantStrings(text.split(/\n+/))).toEqual([]);
  });

  test("returns after completion with every option unmarked, available, and freshly selectable", async ({ page }) => {
    await reachReadyOptions(page);
    await completeOption(page, 3);

    await expect(page.getByText("Done", { exact: true })).toHaveCount(0);
    for (const number of [1, 2, 3]) {
      await expect(option(page, number)).toBeEnabled();
      await expect(option(page, number)).toHaveAttribute("aria-pressed", "false");
      await expect(option(page, number)).toHaveAttribute("data-option-state", "available");
    }
    let state = await page.evaluate(() => window.__pnqAppState());
    expect([state.earSeen, state.setupSeen, state.eduSeen]).toEqual([true, true, true]);
    expect(state.optOrder).toEqual(["d"]);

    await chooseOption(page, 3);
    state = await page.evaluate(() => window.__pnqAppState());
    expect(state.concept).toBe("d");
    expect(state.stages.d).toBe("field");
    expect(state.d).toEqual({ x: .5, y: .5, cx: .5, cy: .5, level: 0, heard: false, zoomed: false, note: "", conf: null });
    expect(state.optDone).toEqual({ d: true });
  });

  for (const order of [
    [1, 2, 3], [1, 3, 2], [2, 1, 3],
    [2, 3, 1], [3, 1, 2], [3, 2, 1]
  ]) {
    test(`the third distinct completion concludes in order ${order.join(" → ")}`, async ({ page }) => {
      await restoreReadyOptions(page);

      for (const [index, number] of order.entries()) {
        await completeFromConfidence(page, number, index === 2);
        const expectedIds = order.slice(0, index + 1).map((value) => optionCid[value]);
        const state = await page.evaluate(() => window.__pnqAppState());
        expect(state.optOrder).toEqual(expectedIds);
        expect(Object.keys(state.optDone).sort()).toEqual([...expectedIds].sort());
        if (index < 2) {
          await expect(page.getByText("Done", { exact: true })).toHaveCount(0);
          for (const value of [1, 2, 3]) await expect(option(page, value)).toBeEnabled();
        }
      }

      const conclusion = page.locator('[data-screen-label="Session complete"]');
      await expect(conclusion).toContainText("All three options are complete");
      expect(auditApplicationParticipantStrings((await conclusion.innerText()).split(/\n+/))).toEqual([]);
      await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
    });
  }

  test("repeating a completed option does not add progress or show a marker", async ({ page }) => {
    await restoreReadyOptions(page);
    await completeFromConfidence(page, 3, false);
    await completeFromConfidence(page, 3, false);

    const state = await page.evaluate(() => window.__pnqAppState());
    expect(state.screen).toBe("home");
    expect(state.optDone).toEqual({ d: true });
    expect(state.optOrder).toEqual(["d"]);
    await expect(page.getByText("Done", { exact: true })).toHaveCount(0);
    await expect(option(page, 3)).toBeEnabled();
  });
});
