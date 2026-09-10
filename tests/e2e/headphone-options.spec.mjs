import { test, expect } from "@playwright/test";
import { startSessionFromSplash } from "./onboarding-helpers.mjs";

async function completeHeadphoneCheck(page) {
  await startSessionFromSplash(page);
  await page.getByRole("button", { name: "Both ears", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: /Headphones Plug in/ }).click();
  await page.getByLabel("Device volume").fill("100");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}

test.describe("headphone check to matching options", () => {
  test.use({ viewport: { width: 420, height: 915 } });

  test("overlays the shared sheet on setup with no initial selection", async ({ page }) => {
    await page.goto("/");
    await completeHeadphoneCheck(page);

    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    await expect(page.locator('[data-matching-options-context="setup"]')).toBeVisible();
    await expect(page.getByText("Let's get set up", { exact: true })).toBeVisible();
    await expect(page.locator("[data-matching-options-sheet]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
    await expect(page.getByText("SOUND PLAYS IN", { exact: true })).toHaveCount(0);

    const state = await page.evaluate(() => window.__pnqAppState());
    expect(state.screen).toBe("home");
    expect(state.setupSeen).toBe(true);
    expect(state.concept).toBe("n");
  });

  test("starts only the last confirmed choice and retains headphone setup", async ({ page }) => {
    await page.goto("/");
    await completeHeadphoneCheck(page);

    const second = page.getByRole("button", { name: "Option 2", exact: true });
    const third = page.getByRole("button", { name: "Option 3", exact: true });
    const continueButton = page.getByRole("button", { name: "Continue", exact: true });

    await second.click();
    await expect(second).toHaveAttribute("aria-pressed", "true");
    await expect(third).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    expect(await page.evaluate(() => window.__pnqAppState().screen)).toBe("home");

    await third.click();
    await expect(second).toHaveAttribute("aria-pressed", "false");
    await expect(third).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    expect(await page.evaluate(() => window.__pnqAppState().screen)).toBe("home");

    await continueButton.click();
    await expect(page.locator('[data-screen-label="Field · Pitch and volume"]')).toBeVisible();
    const state = await page.evaluate(() => window.__pnqAppState());
    expect(state.screen).toBe("flow");
    expect(state.concept).toBe("d");
    expect(state.stages.d).toBe("field");
    expect(state.ear).toBe("Both ears");
    expect(state.hp).toBe(true);
    expect(state.vol).toBe(100);
    expect(state.setupSeen).toBe(true);
  });
});
