/*
 * Focused browser coverage for the patient dashboard (REQ-004): onboarding
 * arrival, inert product context, safe restore behavior, and New Session.
 */
import { test, expect } from "@playwright/test";

const key = "pnq-mtp-v1";

async function arriveAfterOnboarding(page, saved = { onboardingSeen: true }) {
  await page.addInitScript(({ storageKey, value }) => {
    if (sessionStorage.getItem(storageKey) === null) {
      sessionStorage.setItem(storageKey, JSON.stringify(value));
    }
  }, { storageKey: key, value: saved });
  await page.goto("/");
  return page.locator('[data-screen-label="Dashboard"]');
}

test.describe("patient dashboard", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("an onboarding-complete participant arrives at a PNQ dashboard with one product action", async ({ page }) => {
    const dashboard = await arriveAfterOnboarding(page);
    await expect(dashboard).toBeVisible();
    await expect(dashboard.getByText("pnq health", { exact: true })).toBeVisible();

    const newSession = dashboard.getByRole("button", { name: "New Session", exact: true });
    await expect(newSession).toBeVisible();
    await expect(dashboard.locator("button")).toHaveCount(1);
    await expect(page.locator("button")).toHaveCount(1);
    await expect(dashboard.locator("a, input, select, textarea, [role='link']")).toHaveCount(0);

    // Context helps the screen read as a patient app, but is deliberately not
    // a set of placeholder destinations or live account features.
    const tiles = dashboard.locator("[data-context-tile]");
    await expect(tiles).toHaveCount(3);
    for (const tile of await tiles.all()) {
      await expect(tile).not.toHaveAttribute("tabindex");
      await expect(tile).not.toHaveAttribute("role");
    }

    await expect(dashboard).not.toContainText(/Option 1|Option 2|Option 3/);
    await expect(dashboard).not.toContainText(/Narrowing|Comparison|Pitch and volume/i);
    await expect(dashboard).not.toContainText(/Messages|Forms|History|Profile|Treatment/i);
  });

  test("context tiles are inert and expose no dead-end navigation", async ({ page }) => {
    const dashboard = await arriveAfterOnboarding(page);
    await expect(dashboard).toBeVisible();
    const initialUrl = page.url();
    const initialState = await page.evaluate(() => window.__pnqAppState());

    for (const tile of await dashboard.locator("[data-context-tile]").all()) {
      await tile.dispatchEvent("click");
      await expect(dashboard).toBeVisible();
    }

    expect(page.url()).toBe(initialUrl);
    expect(await page.evaluate(() => window.__pnqAppState())).toEqual(initialState);
    await expect(page.locator("[role='dialog']")).toHaveCount(0);
  });

  test("New Session enters ear selection in silence without previewing matching options", async ({ page }) => {
    const dashboard = await arriveAfterOnboarding(page);
    await expect(dashboard).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine?.playingKey() ?? null)).toBe(null);

    await dashboard.getByRole("button", { name: "New Session", exact: true }).click();

    await expect(page.locator('[data-screen-label="Setup · Ear"]')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine?.playingKey() ?? null)).toBe(null);
    expect(await page.evaluate(() => window.__pnqAppState().playKey)).toBe(null);
  });

  test("reload returns onboarding-complete state to the dashboard until session progress exists", async ({ page }) => {
    const dashboard = await arriveAfterOnboarding(page);
    await expect(dashboard).toBeVisible();

    await page.reload();
    await expect(page.locator('[data-screen-label="Dashboard"]')).toBeVisible();

    // Opening the entry screen is not progress; an interrupted entry returns
    // to the safe dashboard. Completing ear selection resumes at the next
    // required gate and still cannot expose the option selector early.
    await page.getByRole("button", { name: "New Session", exact: true }).click();
    await page.reload();
    await expect(page.locator('[data-screen-label="Dashboard"]')).toBeVisible();

    await page.getByRole("button", { name: "New Session", exact: true }).click();
    await page.getByText("Both ears", { exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.reload();
    await expect(page.locator('[data-screen-label="Setup · Headphones and volume"]')).toBeVisible();
    await expect(page.locator('[data-screen-label="Matching options"]')).toHaveCount(0);
  });
});
