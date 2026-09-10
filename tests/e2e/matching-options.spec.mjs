import { test, expect } from "@playwright/test";

async function seedMatchingOptions(page, optDone = {}, optOrder = []) {
  await page.addInitScript(({ done, order }) => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
    onboardingSeen: true,
    earSeen: true,
    setupSeen: true,
    eduSeen: true,
    optDone: done,
    optOrder: order
  })), { done: optDone, order: optOrder });
  await page.goto("/");
}

test.describe("matching-options half-sheet", () => {
  test.use({ viewport: { width: 420, height: 915 } });

  test("renders over context with all actions contained at the reference viewport", async ({ page }) => {
    await seedMatchingOptions(page);
    const sheet = page.locator("[data-matching-options-sheet]");
    const context = page.locator("[data-matching-options-context]");

    await expect(sheet).toBeVisible();
    await expect(context).toBeVisible();
    await expect(context).toHaveAttribute("aria-hidden", "true");
    await expect(context).toHaveAttribute("inert", "");
    await expect(page.getByRole("button", { name: "Option 1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Option 2" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Option 3" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
    await expect(page.getByText("GETTING SET UP", { exact: true })).toHaveCount(0);

    const bounds = await sheet.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds.y).toBeGreaterThan(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(915);
  });

  test("selects and reselects without navigating, then Continue emits exactly one choice", async ({ page }) => {
    await seedMatchingOptions(page);
    const first = page.getByRole("button", { name: "Option 1" });
    const third = page.getByRole("button", { name: "Option 3" });
    const continueButton = page.getByRole("button", { name: "Continue" });

    await expect(continueButton).toBeDisabled();
    await continueButton.click({ force: true });
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();

    await first.click();
    await expect(first).toHaveAttribute("aria-pressed", "true");
    await expect(third).toHaveAttribute("aria-pressed", "false");
    await expect(continueButton).toBeEnabled();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();

    await third.click();
    await expect(first).toHaveAttribute("aria-pressed", "false");
    await expect(third).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();

    await continueButton.click();
    await expect(page.locator('[data-screen-label="Field · Pitch and volume"]')).toBeVisible();
    expect(await page.evaluate(() => window.__pnqAppState().concept)).toBe("d");
  });

  test("prior completion never marks or disables an option and reopening resets selection", async ({ page }) => {
    await seedMatchingOptions(page, { n: true, r: true }, ["r", "n"]);
    const options = [1, 2, 3].map((number) => page.getByRole("button", { name: `Option ${number}` }));

    await expect(page.getByText("Done", { exact: true })).toHaveCount(0);
    for (const option of options) {
      await expect(option).toBeEnabled();
      await expect(option).toHaveAttribute("aria-pressed", "false");
      await expect(option).toHaveAttribute("data-option-state", "available");
    }

    await options[0].click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Back" }).click();

    await expect(page.locator("[data-matching-options-sheet]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Option 1" })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await expect(page.getByText("Done", { exact: true })).toHaveCount(0);
  });
});
