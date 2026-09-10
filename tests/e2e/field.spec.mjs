import { test, expect } from "@playwright/test";
import { startMatchingOption } from "./onboarding-helpers.mjs";
import { primaryActionTop } from "./action-region-helpers.mjs";

async function seed(page) {
  await page.addInitScript(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
    ear: "Both ears", hp: true, vol: 100, setupSeen: true, eduSeen: true, optDone: {}, optOrder: []
  })));
}

async function jumpTo(page, label) {
  await page.goto("/");
  await page.getByRole("button", { name: "Session menu" }).click();
  await page.getByRole("button", { name: "Jump to a different section" }).click();
  await page.getByRole("button", { name: label, exact: true }).click();
}

const dState = (page) => page.evaluate(() => window.__pnqAppState().d);
const playing = (page) => page.evaluate(() => window.__pnqAudioEngine.playingKey());

// Drag the marker with real pointer input: down on its center, move, release.
async function drag(page, toX, toY) {
  const box = await page.locator("[data-field-marker]").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(toX, toY, { steps: 8 });
  await page.mouse.up();
}

test.describe("field (Option 3)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("field primary action stays in the bottom region across note and enablement states", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Whole field");

    const label = "Look closely at this area";
    const initialTop = await primaryActionTop(page, label);
    await expect(page.getByRole("button", { name: label })).toBeDisabled();

    await page.getByRole("button", { name: "Can't hear this" }).click();
    await expect(page.getByText(/worth telling us/)).toBeVisible();
    expect(await primaryActionTop(page, label)).toBe(initialTop);

    await page.getByRole("button", { name: "Play the sound" }).click();
    await expect(page.getByRole("button", { name: label })).toBeEnabled();
    expect(await primaryActionTop(page, label)).toBe(initialTop);
  });

  test("field broad pass: dragging steers pitch and volume live, capped at the ceiling", async ({ page }) => {
    await seed(page);
    await page.goto("/");
    await startMatchingOption(page, 3);
    await expect(page.locator('[data-screen-label="Field · Pitch and volume"]')).toBeVisible();
    await expect(page.getByText("Move around and listen")).toBeVisible();

    // No advancing on a marker that has never been heard.
    const advance = page.getByRole("button", { name: "Look closely at this area" });
    await expect(advance).toBeDisabled();
    await page.getByRole("button", { name: "Play the sound" }).click();
    await expect.poll(() => playing(page)).toBe("dfield");
    await expect(advance).toBeEnabled();

    // Drag right and far above the field: pitch follows, the vertical axis
    // pins at the ceiling instead of getting louder.
    const fbox = await page.locator("[data-field]").boundingBox();
    await drag(page, fbox.x + fbox.width * .9, fbox.y - 60);
    let d = await dState(page);
    expect(d.x).toBeGreaterThan(.8);
    expect(d.y).toBe(0);
    expect(await playing(page)).toBe("dfield");

    // Releasing keeps the position.
    await page.mouse.move(fbox.x + fbox.width * .2, fbox.y + fbox.height * .8);
    const after = await dState(page);
    expect(after.x).toBe(d.x);
    expect(after.y).toBe(d.y);
  });

  test("field zoom recenters on the chosen region and scales the decorative grid", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Whole field");
    await page.getByRole("button", { name: "Play the sound" }).click();
    await expect.poll(() => playing(page)).toBe("dfield");

    const fbox = await page.locator("[data-field]").boundingBox();
    await drag(page, fbox.x + fbox.width * .7, fbox.y + fbox.height * .4);
    const before = await dState(page);
    await expect(page.locator("[data-field-region]")).toBeVisible();

    await page.getByRole("button", { name: "Look closely at this area" }).click();
    let d = await dState(page);
    expect(d.level).toBe(1);
    expect(d.cx).toBeCloseTo(before.x, 6);
    expect(d.cy).toBeCloseTo(before.y, 6);
    await expect(page.getByText(/Same idea, a smaller area/)).toBeVisible();
    // The grid layer visibly scales up (1/.38). The stage transition stops
    // audio and the new zoom must be played before judgment.
    await expect(page.locator("[data-field-grid]")).toHaveCSS("transform", /matrix\(2\.63/);
    expect(await playing(page)).toBe(null);
    await expect(page.getByRole("button", { name: "Look closely at this area" })).toBeDisabled();
    await page.getByRole("button", { name: "Play the sound" }).click();

    await page.getByRole("button", { name: "Look closely at this area" }).click();
    d = await dState(page);
    expect(d.level).toBe(2);
    expect(await playing(page)).toBe(null);
    await expect(page.getByText("Closer still")).toBeVisible();
    await expect(page.locator("[data-field-grid]")).toHaveCSS("transform", /matrix\(6\.66/);
    await expect(page.locator("[data-field-region]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "This sounds like my tinnitus" })).toBeVisible();
  });

  test("field completion is participant-confirmed into shared confidence and match complete", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Closer look · closest");
    await page.getByRole("button", { name: "This sounds like my tinnitus" }).click();
    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    await page.getByText("Very close", { exact: true }).click();
    await page.getByRole("button", { name: "Finish matching" }).click();
    await expect(page.locator('[data-screen-label="Shared · Match complete"]')).toBeVisible();
    await page.getByRole("button", { name: "Return to matching options" }).click();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    await expect(page.getByText("Done", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Option 3" })).toBeEnabled();
  });

  test("field escapes reassure and leave a runnable stage", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Closer look");
    await expect(page.getByText(/Same idea, a smaller area/)).toBeVisible();

    await page.getByRole("button", { name: "Can't hear this" }).click();
    await expect(page.getByText(/okay, and worth telling us/)).toBeVisible();
    await expect(page.getByText(/moving the marker higher/)).toBeVisible();
    // Still on the same runnable stage with audio available.
    await page.getByRole("button", { name: "Play from here" }).click();
    await expect.poll(() => playing(page)).toBe("dfield");

    await page.getByRole("button", { name: "Start over" }).click();
    await expect(page.getByText("Move around and listen")).toBeVisible();
    const d = await dState(page);
    expect(d.level).toBe(0);
    expect(d.x).toBe(.5);
    expect(d.heard).toBe(false);
    await expect(page.getByRole("button", { name: "Look closely at this area" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Play the sound" })).toBeVisible();
  });

  test("field Back steps out one zoom level and keeps the marker where it was", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Closer look · closest");
    await expect(page.getByText("Closer still")).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    let d = await dState(page);
    expect(d.level).toBe(1);
    await expect(page.getByText(/Back out one step/)).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    d = await dState(page);
    expect(d.level).toBe(0);
    expect(d.x).toBe(.5);
    await expect(page.getByText(/Back to the whole range/)).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
  });
});
