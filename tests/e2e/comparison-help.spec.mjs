import { test, expect } from "@playwright/test";
import { openSessionMenu } from "./onboarding-helpers.mjs";
import { openContextualHelp } from "./contextual-help-helpers.mjs";

async function seed(page) {
  await page.addInitScript(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
    ear: "Both ears", hp: true, vol: 100, setupSeen: true, eduSeen: true, optDone: {}, optOrder: []
  })));
}

async function openComparison(page) {
  await page.goto("/");
  await openSessionMenu(page);
  await page.getByRole("button", { name: "Jump to a different section" }).click();
  await page.getByRole("button", { name: "A/B comparisons", exact: true }).click();
  await expect(page.locator('[data-screen-label="Shared · Two-sound comparison"]')).toBeVisible();
}

const appState = (page) => page.evaluate(() => window.__pnqAppState());

test.describe("comparison contextual Help (REQ-001, REQ-003)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("replaces the inline audibility link and closes back onto the unchanged pair", async ({ page }) => {
    await seed(page);
    await openComparison(page);

    const screen = page.locator("[data-screen]");
    const footer = page.locator("[data-shell-footer]");
    await expect(screen.getByRole("button", { name: "I can't hear these sounds", exact: true })).toHaveCount(0);
    await expect(footer.getByRole("button", { name: "Back", exact: true })).toBeVisible();
    await expect(footer.getByRole("button", { name: "Help", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Play sound 1" }).click();
    const beforeHelp = await appState(page);
    const dialog = await openContextualHelp(page);
    await expect(dialog.locator("[data-help-actions] > button")).toHaveText(["Can't hear these sounds"]);
    await dialog.getByRole("button", { name: "Close help" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(footer.getByRole("button", { name: "Help", exact: true })).toBeFocused();
    expect(await appState(page)).toEqual(beforeHelp);
    await expect(page.getByRole("button", { name: "Stop sound 1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "This one" }).first()).toBeDisabled();
  });

  test("audibility guidance returns to the same progress with comparison actions intact", async ({ page }) => {
    await seed(page);
    await openComparison(page);

    const before = (await appState(page)).r;
    const dialog = await openContextualHelp(page);
    await dialog.getByRole("button", { name: "Can't hear these sounds", exact: true }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.locator('[data-screen-label="Shared · Two-sound comparison"]')).toBeVisible();
    await expect(page.getByText("We made the sounds a little easier to hear. Check your headphones, then replay.")).toBeVisible();

    const after = (await appState(page)).r;
    expect(after.level).toBeCloseTo(before.level + .12, 6);
    for (const key of ["center", "spread", "round", "uncertain"]) {
      expect(after[key]).toBe(before[key]);
    }

    await expect(page.getByRole("button", { name: "Play sound 1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play sound 2" })).toBeVisible();
    await expect(page.getByRole("button", { name: "This one" })).toHaveCount(2);
    await expect(page.getByRole("button", { name: "Neither is close", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "They sound the same", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.locator('[data-screen-label="Shared · Listen and respond"]')).toBeVisible();
    expect((await appState(page)).stages.r).toBe("dir");
  });
});
