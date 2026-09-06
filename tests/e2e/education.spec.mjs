import { test, expect } from "@playwright/test";

async function reachEducation(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByText("Both ears", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Headphones Plug in/ }).click();
  await page.getByLabel("Device volume").fill("100");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "What to listen for" }).click();
}

test.describe("education", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shared examples toggle through the audio engine and completion persists", async ({ page }) => {
    await reachEducation(page);
    await expect(page.locator('[data-screen-label="Shared · What to listen for"]')).toBeVisible();

    await page.getByRole("button", { name: /A lower sound/ }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("edu-PITCH0");
    await page.getByRole("button", { name: /A lower sound/ }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);

    await page.getByRole("button", { name: "I'm ready to start" }).click();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Option 1" })).not.toHaveAttribute("aria-disabled", "true");
    expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("pnq-mtp-v1")).eduSeen)).toBe(true);
  });

  test("working-stage judgment stays in place and gray until playback", async ({ page }) => {
    await reachEducation(page);
    await page.getByRole("button", { name: "I'm ready to start" }).click();
    await page.getByRole("button", { name: "Option 1" }).click();

    const advance = page.getByRole("button", { name: "The volume is about right" });
    await expect(advance).toBeVisible();
    await expect(advance).toBeDisabled();
    await page.getByText("Start Sound", { exact: true }).click();
    await expect(advance).toBeEnabled();
    await advance.click();
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();
    // Advancing is live, so the carried tone keeps the next pass unlocked;
    // stopping it re-locks the pass until it has been heard here.
    await page.getByText("Stop Sound", { exact: true }).click();
    await expect(page.getByRole("button", { name: "Next: closer adjustments" })).toBeDisabled();
  });
});
