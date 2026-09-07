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

    const lower = page.getByRole("button", { name: /A lower sound/ });
    await expect(lower).toHaveAttribute("aria-pressed", "false");
    await lower.press("Enter");
    await expect(lower).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("edu-PITCH0");
    await lower.press("Space");
    await expect(lower).toHaveAttribute("aria-pressed", "false");
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
    const play = page.getByRole("button", { name: "Start Sound", exact: true });
    await expect(play).toHaveAttribute("aria-pressed", "false");
    await play.press("Enter");
    await expect(page.getByRole("button", { name: "Stop Sound", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(advance).toBeEnabled();
    await advance.click();
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();
    // The stage transition hard-stops audio, so the new pass stays locked
    // until its own sound has been played (REQ-001, REQ-018).
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
    await expect(page.getByRole("button", { name: "Next: closer adjustments" })).toBeDisabled();
  });
});
