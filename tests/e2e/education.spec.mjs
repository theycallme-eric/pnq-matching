import { test, expect } from "@playwright/test";
import { startMatchingOption, startSessionFromSplash } from "./onboarding-helpers.mjs";

async function reachEducation(page) {
  await page.goto("/");
  await startSessionFromSplash(page);
  await page.getByText("Both ears", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Headphones Plug in/ }).click();
  await page.getByLabel("Device volume").fill("100");
  await page.getByRole("button", { name: "Continue" }).click();
}

test.describe("education", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("dashboard education remains directly accessible and returns without completing a session gate", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
      onboardingSeen: true
    })));
    await page.goto("/");

    const home = page.locator('[data-screen-label="Dashboard"]');
    const card = home.locator('[data-explore-pnq-card]');
    await expect(card.locator('[data-explore-row]')).toHaveCount(5);
    await home.getByRole("button", { name: "What to listen for", exact: true }).click();
    await expect(page.locator('[data-screen-label="Shared · What to listen for"]')).toBeVisible();

    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(home).toBeVisible();
    await expect(card.locator('[data-explore-row]')).toHaveCount(5);
    expect(await page.evaluate(() => window.__pnqAppState().onboardingSeen)).toBe(true);
    expect(await page.evaluate(() => window.__pnqAppState().optDone)).toEqual({});
    expect(await page.evaluate(() => window.__pnqAppState().optOrder)).toEqual([]);

    await home.getByRole("button", { name: "What to listen for", exact: true }).click();
    await page.getByRole("button", { name: /Louder/ }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("edu-LOUDNESS1");
    await page.getByRole("button", { name: "I'm ready to start" }).click();
    await expect(home).toBeVisible();
    await expect(page.locator("[data-matching-options-sheet]")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("pnq-mtp-v1")).eduSeen)).toBe(false);
  });

  test("active-session education keeps its examples and stops playback before opening the sheet", async ({ page }) => {
    await reachEducation(page);
    const education = page.locator('[data-screen-label="Shared · What to listen for"]');
    await expect(education).toBeVisible();
    for (const label of ["A lower sound", "A higher sound", "Quieter", "Louder"]) {
      await expect(education.getByText(label, { exact: true })).toBeVisible();
    }

    const lower = page.getByRole("button", { name: /A lower sound/ });
    await expect(lower).toHaveAttribute("aria-pressed", "false");
    await lower.press("Enter");
    await expect(lower).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("edu-PITCH0");

    await page.getByRole("button", { name: "I'm ready to start" }).click();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    await expect(page.locator('[data-matching-options-context="education"]')).toBeVisible();
    await expect(page.locator("[data-matching-options-sheet]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
    await expect(page.locator('[data-option-state="selected"]')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
    expect(await page.evaluate(() => window.__pnqAppState().playKey)).toBe(null);
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("pnq-mtp-v1")).eduSeen)).toBe(true);
  });

  test("reload resumes each active-session gate and always starts silent", async ({ page }) => {
    const restore = async (value) => {
      await page.evaluate((stored) => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify(stored)), value);
      await page.reload();
      await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine?.playingKey() ?? null)).toBe(null);
      expect(await page.evaluate(() => window.__pnqAppState().playKey)).toBe(null);
    };

    await page.goto("/");
    await restore({ onboardingSeen: true, earSeen: false, setupSeen: true, eduSeen: true });
    await expect(page.locator('[data-screen-label="Setup · Ear"]')).toBeVisible();

    await restore({ onboardingSeen: true, earSeen: true, setupSeen: false, eduSeen: true });
    await expect(page.locator('[data-screen-label="Setup · Headphones and volume"]')).toBeVisible();

    await restore({ onboardingSeen: true, earSeen: true, setupSeen: true, eduSeen: false });
    await expect(page.locator('[data-screen-label="Shared · What to listen for"]')).toBeVisible();
    await expect(page.locator("[data-matching-options-sheet]")).toHaveCount(0);

    await restore({ onboardingSeen: true, earSeen: true, setupSeen: true, eduSeen: true });
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    await expect(page.locator('[data-matching-options-context="education"]')).toBeVisible();
    await expect(page.locator("[data-matching-options-sheet]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
  });

  test("working-stage judgment stays in place and gray until playback", async ({ page }) => {
    await reachEducation(page);
    await page.getByRole("button", { name: "I'm ready to start" }).click();
    await startMatchingOption(page, 1);

    const advance = page.getByRole("button", { name: "This volume is close" });
    await expect(advance).toBeVisible();
    await expect(advance).toBeDisabled();
    const play = page.getByRole("button", { name: "Start Sound", exact: true });
    await expect(play).toHaveAttribute("aria-pressed", "false");
    await play.press("Enter");
    await expect(page.getByRole("button", { name: "Stop Sound", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(advance).toBeEnabled();
    await advance.click();
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();
    // Once matching playback starts, a normal in-option transition carries
    // both the active owner and the heard gate into the next pass.
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("main");
    await expect(page.getByRole("button", { name: "Stop Sound", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Next: closer adjustments" })).toBeEnabled();
  });
});
