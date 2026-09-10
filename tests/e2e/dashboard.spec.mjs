/*
 * Focused browser coverage for the patient dashboard (REQ-004): onboarding
 * arrival, grouped Explore PNQ content, safe restore behavior, and New Session.
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

  test("an onboarding-complete participant arrives at a PNQ dashboard with the grouped Explore PNQ card", async ({ page }) => {
    const dashboard = await arriveAfterOnboarding(page);
    await expect(dashboard).toBeVisible();
    await expect(dashboard.getByText("pnq health", { exact: true })).toBeVisible();

    const newSession = dashboard.getByRole("button", { name: "New Session", exact: true });
    await expect(newSession).toBeVisible();
    await expect(dashboard.locator("button")).toHaveCount(2);
    await expect(page.locator("button")).toHaveCount(2);
    await expect(dashboard.locator("a, input, select, textarea, [role='link']")).toHaveCount(0);

    const card = dashboard.locator("[data-explore-pnq-card]");
    await expect(card).toHaveCount(1);
    await expect(card.locator("[data-explore-row]")).toHaveCount(5);

    await expect(dashboard).not.toContainText(/Option 1|Option 2|Option 3/);
    await expect(dashboard).not.toContainText(/Narrowing|Comparison|Pitch and volume/i);
    await expect(card).toContainText("Messages");
    await expect(card).toContainText("Forms & Assessments");
    await expect(card).toContainText("Session History");
    await expect(card).toContainText("Profile");
    await expect(card).toContainText("What to listen for");
  });

  test("the first four Explore PNQ rows are inert and expose no dead-end navigation", async ({ page }) => {
    const dashboard = await arriveAfterOnboarding(page);
    await expect(dashboard).toBeVisible();
    const initialUrl = page.url();
    const initialState = await page.evaluate(() => window.__pnqAppState());

    for (const key of ["messages", "forms", "history", "profile"]) {
      await dashboard.locator(`[data-explore-row="${key}"]`).click();
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
