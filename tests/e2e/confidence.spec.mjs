import { test, expect } from "@playwright/test";

async function openConfidence(page, optionNumber = 1) {
  await page.addInitScript(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
    ear: "Both ears", hp: true, vol: 100, setupSeen: true, eduSeen: true, optDone: {}, optOrder: []
  })));
  await page.goto("/");
  await page.getByRole("button", { name: `Option ${optionNumber}` }).click();
  await page.getByRole("button", { name: "Session menu" }).click();
  await page.getByRole("button", { name: "Jump to a different section" }).click();
  await page.getByRole("button", { name: "Confidence", exact: true }).nth(optionNumber - 1).click();
  await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
}

test.describe("confidence and completion", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("confidence replays the match and switches to the refinement footer", async ({ page }) => {
    await openConfidence(page);
    const finish = page.getByRole("button", { name: "Finish matching" });
    await expect(finish).toBeDisabled();

    await page.getByText("Start Sound", { exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("main");
    await page.getByText("Not close yet", { exact: true }).click();
    await expect(page.getByRole("button", { name: "Keep refining" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Finish anyway" })).toBeVisible();
    await expect(page.getByText(/keep refining, or finish now/)).toBeVisible();

    await page.getByRole("button", { name: "Keep refining" }).click();
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();
    expect(await page.evaluate(() => window.__pnqAppState().n.conf)).toBe(null);
  });

  test("finishing shows the summary and returns a persisted Done option to the hub", async ({ page }) => {
    await openConfidence(page);
    await page.getByText("Very close", { exact: true }).click();
    await page.getByRole("button", { name: "Finish matching" }).click();
    await expect(page.locator('[data-screen-label="Shared · Match complete"]')).toBeVisible();
    await expect(page.getByText("That’s this one done", { exact: true })).toBeVisible();
    await expect(page.getByText("Both ears", { exact: true })).toBeVisible();
    await expect(page.getByText("Very close", { exact: true })).toBeVisible();
    await expect(page.getByText("Treatment isn't part of this prototype.", { exact: false })).toBeVisible();
    await expect(page.locator("[data-technical-values]")) .toHaveCount(0);

    await page.evaluate(() => {
      window.__pnqAppState().showTech = true;
      window.dispatchEvent(new Event("resize"));
    });
    await expect(page.locator("[data-technical-values]")).toContainText(/Hz|kHz/);
    await expect(page.locator("[data-technical-values]")).toContainText("dB");

    await page.evaluate(() => window.__pnqAudioEngine.play("completion-probe", [
      { kind: "tone", pitch: 0.5, level: 0.3 }
    ]));
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("completion-probe");
    await page.getByRole("button", { name: "Return to matching options" }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
    const option = page.getByRole("button", { name: /Option 1/ });
    await expect(option.getByText("Done", { exact: true })).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem("pnq-mtp-v1")));
    expect(saved.optDone.n).toBe(true);
    expect(saved.optOrder).toEqual(["n"]);
  });

  for (const optionNumber of [1, 2, 3]) {
    test(`Option ${optionNumber} confidence and completion stay participant-controlled and silent`, async ({ page }) => {
      await openConfidence(page, optionNumber);
      await page.getByText("Start Sound", { exact: true }).click();
      await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("main");
      await page.getByText("Fairly close", { exact: true }).click();
      await page.getByRole("button", { name: "Finish matching" }).click();

      const completion = page.locator('[data-screen-label="Shared · Match complete"]');
      await expect(completion).toBeVisible();
      await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
      expect(await page.evaluate(() => ({
        screen: window.__pnqAppState().screen,
        stage: window.__pnqAppState().stages[window.__pnqAppState().concept],
        done: window.__pnqAppState().optDone
      }))).toEqual({ screen: "flow", stage: "done", done: {} });

      await page.waitForTimeout(300);
      await expect(completion).toBeVisible();
      await expect(page.getByRole("button", { name: "Return to matching options" })).toBeVisible();
      await expect(page.locator('[data-screen-label="Matching options"]')).toHaveCount(0);
    });
  }
});
