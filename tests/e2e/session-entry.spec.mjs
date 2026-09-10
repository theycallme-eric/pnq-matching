/*
 * Focused browser coverage for the session-level setup sequence (REQ-005):
 * New Session -> ear -> headphones/volume -> education -> option selector,
 * followed by direct returns to that selector after Options 1 and 2.
 */
import { test, expect } from "@playwright/test";
import { startMatchingOption, startSessionFromSplash } from "./onboarding-helpers.mjs";

const storageKey = "pnq-mtp-v1";
const screen = (page, label) => page.locator(`[data-screen-label="${label}"]`);
const selector = (page) => screen(page, "Matching options");

async function expectSilent(page) {
  await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine?.playingKey() ?? null)).toBe(null);
  expect(await page.evaluate(() => window.__pnqAppState().playKey)).toBe(null);
}

async function expectNoPrematureSelector(page) {
  await expect(selector(page)).toHaveCount(0);
  for (const n of [1, 2, 3]) {
    await expect(page.getByRole("button", { name: `Option ${n}` })).toHaveCount(0);
  }
}

async function finishOption1(page) {
  await startMatchingOption(page, 1);
  await page.getByRole("button", { name: "Start Sound", exact: true }).click();
  await page.getByRole("button", { name: "The volume is about right" }).click();
  await page.getByRole("button", { name: "Start Sound", exact: true }).click();
  await page.getByRole("button", { name: "Next: closer adjustments" }).click();
  await page.getByRole("button", { name: "Start Sound", exact: true }).click();
  await page.getByRole("button", { name: "Next: fine adjustments" }).click();
  await page.getByRole("button", { name: "Start Sound", exact: true }).click();
  await page.getByRole("button", { name: "This matches what I hear" }).click();
  await page.getByText("Fairly close", { exact: true }).click();
  await page.getByRole("button", { name: "Finish matching" }).click();
}

async function finishOption2(page) {
  await startMatchingOption(page, 2);
  await page.getByRole("button", { name: "Start Sound", exact: true }).click();
  await page.getByRole("button", { name: "The volume is set, move on" }).click();
  await page.getByRole("button", { name: "The pitch is set, finish up" }).click();
  await page.getByRole("button", { name: "The pitch is set, finish up" }).click();
  await page.getByRole("button", { name: "They sound the same" }).click();
  await page.getByText("Fairly close", { exact: true }).click();
  await page.getByRole("button", { name: "Finish matching" }).click();
}

test.describe("session entry", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("runs setup once in order and returns Options 1 and 2 directly to the selector", async ({ page }) => {
    await page.goto("/");
    await startSessionFromSplash(page);

    // New Session always starts a fresh, silent ear gate with no selection.
    const ear = screen(page, "Setup · Ear");
    await expect(ear).toBeVisible();
    await expectNoPrematureSelector(page);
    await expectSilent(page);
    expect(await page.evaluate(() => window.__pnqAppState().ear)).toBe("");
    for (const label of ["Left ear", "Right ear", "Both ears"]) {
      await expect(page.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "false");
    }
    const earContinue = page.getByRole("button", { name: "Continue" });
    await expect(earContinue).toHaveAttribute("aria-disabled", "true");
    await earContinue.click({ force: true });
    await expect(ear.getByText("Choose an ear to continue.")).toBeVisible();
    await page.getByRole("button", { name: "Left ear" }).click();
    await expect(page.getByRole("button", { name: "Left ear" })).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => window.__pnqAppState().ear)).toBe("Left ear");
    await earContinue.click();

    // Ear advances only to the existing device gate; Back cannot reveal the selector.
    const setup = screen(page, "Setup · Headphones and volume");
    await expect(setup).toBeVisible();
    await expectNoPrematureSelector(page);
    await expectSilent(page);
    let state = await page.evaluate(() => window.__pnqAppState());
    expect({ earSeen: state.earSeen, hp: state.hp, vol: state.vol }).toEqual({ earSeen: true, hp: false, vol: 36 });
    const setupContinue = page.getByRole("button", { name: "Continue" });
    await expect(setupContinue).toHaveAttribute("aria-disabled", "true");
    await setupContinue.click({ force: true });
    await expect(setup).toBeVisible();
    await page.getByRole("button", { name: /Headphones Plug in/ }).click();
    await page.getByLabel("Device volume").fill("100");
    await setupContinue.click();

    // Device completion goes straight to the unchanged education, never via the selector.
    const education = screen(page, "Shared · What to listen for");
    await expect(education).toBeVisible();
    await expectNoPrematureSelector(page);
    await expectSilent(page);
    state = await page.evaluate(() => window.__pnqAppState());
    expect({ earSeen: state.earSeen, setupSeen: state.setupSeen, eduSeen: state.eduSeen })
      .toEqual({ earSeen: true, setupSeen: true, eduSeen: false });

    // Education audio is participant-triggered and its completion transition hard-stops it.
    await page.getByRole("button", { name: /A lower sound/ }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("edu-PITCH0");
    await page.getByRole("button", { name: "I'm ready to start" }).click();
    await expect(selector(page)).toBeVisible();
    await expectSilent(page);
    for (const n of [1, 2, 3]) await expect(page.getByRole("button", { name: `Option ${n}` })).toBeEnabled();

    const stored = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)), storageKey);
    expect(Object.keys(stored).sort()).toEqual(["onboardingSeen", "earSeen", "setupSeen", "eduSeen", "optDone", "optOrder"].sort());
    expect({ earSeen: stored.earSeen, setupSeen: stored.setupSeen, eduSeen: stored.eduSeen })
      .toEqual({ earSeen: true, setupSeen: true, eduSeen: true });

    // Returning from each of the first two real option completions bypasses all session gates.
    await finishOption1(page);
    await expect(screen(page, "Shared · Match complete")).toBeVisible();
    await expectSilent(page);
    await page.getByRole("button", { name: "Return to matching options" }).click();
    await expect(selector(page)).toBeVisible();
    await expect(screen(page, "Setup · Ear")).toHaveCount(0);
    await expect(screen(page, "Setup · Headphones and volume")).toHaveCount(0);
    await expect(screen(page, "Shared · What to listen for")).toHaveCount(0);
    await expectSilent(page);

    await finishOption2(page);
    await expect(screen(page, "Shared · Match complete")).toBeVisible();
    await expectSilent(page);
    await page.getByRole("button", { name: "Return to matching options" }).click();
    await expect(selector(page)).toBeVisible();
    await expect(screen(page, "Setup · Ear")).toHaveCount(0);
    await expect(screen(page, "Setup · Headphones and volume")).toHaveCount(0);
    await expect(screen(page, "Shared · What to listen for")).toHaveCount(0);
    await expectSilent(page);
    expect((await page.evaluate(() => window.__pnqAppState().optOrder))).toEqual(["n", "r"]);
  });
});
