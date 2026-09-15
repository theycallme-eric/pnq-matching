import { test, expect } from "@playwright/test";
import { openSessionMenu, startMatchingOption } from "./onboarding-helpers.mjs";
import { primaryActionTop } from "./action-region-helpers.mjs";
import { chooseHelpAction } from "./contextual-help-helpers.mjs";

async function seed(page) {
  await page.addInitScript(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
    ear: "Both ears", hp: true, vol: 100, setupSeen: true, eduSeen: true, optDone: {}, optOrder: []
  })));
}

async function jumpTo(page, label) {
  await page.goto("/");
  await openSessionMenu(page);
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

const bottomOf = (box) => box.y + box.height;
const rightOf = (box) => box.x + box.width;
const overlaps = (a, b) =>
  a.x < rightOf(b) && rightOf(a) > b.x && a.y < bottomOf(b) && bottomOf(a) > b.y;

async function expectCenterHitTarget(page, locator) {
  const ownsCenter = await locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === element || element.contains(hit);
  });
  expect(ownsCenter).toBe(true);
}

async function expectCompleteFieldFit(page, viewport) {
  const field = page.locator("[data-field]");
  const layout = page.locator("[data-field-layout]");
  const content = page.locator("[data-field-content]");
  const marker = page.locator("[data-field-marker]");
  const actionRegion = page.locator("[data-primary-action-region]");
  const playback = page.locator("[data-field-playback]");
  const back = page.getByRole("button", { name: "Back", exact: true });
  const progressive = page.getByRole("button", { name: "Look closely at this area" });
  const labels = ["LOUDER", "QUIETER", "LOWER", "HIGHER"]
    .map((label) => page.getByText(label, { exact: true }));

  await expect(field).toBeVisible();
  await expect(layout).toBeVisible();
  await expect(content).toBeVisible();
  await expect(marker).toBeVisible();
  await expect(playback).toBeVisible();
  await expect(back).toBeVisible();
  await expect(progressive).toBeVisible();
  for (const label of labels) await expect(label).toBeVisible();

  const [fieldBox, layoutBox, markerBox, actionBox, playbackBox, backBox, progressiveBox, ...labelBoxes] =
    await Promise.all([
      field.boundingBox(), layout.boundingBox(), marker.boundingBox(), actionRegion.boundingBox(),
      playback.boundingBox(), back.boundingBox(), progressive.boundingBox(),
      ...labels.map((label) => label.boundingBox())
    ]);

  for (const box of [fieldBox, layoutBox, markerBox, actionBox, playbackBox, backBox, progressiveBox, ...labelBoxes]) {
    expect(box).not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(-0.5);
    expect(rightOf(box)).toBeLessThanOrEqual(viewport.width + 0.5);
    expect(box.y).toBeGreaterThanOrEqual(-0.5);
    expect(bottomOf(box)).toBeLessThanOrEqual(viewport.height + 0.5);
  }

  // The grid stays square, while its complete label layout remains above the
  // fixed progressive-action region at the initial, unscrolled position.
  expect(Math.abs(fieldBox.width - fieldBox.height)).toBeLessThanOrEqual(1);
  expect(bottomOf(layoutBox)).toBeLessThanOrEqual(actionBox.y + 0.5);
  expect(bottomOf(fieldBox)).toBeLessThanOrEqual(actionBox.y + 0.5);
  for (const labelBox of labelBoxes) {
    expect(bottomOf(labelBox)).toBeLessThanOrEqual(actionBox.y + 0.5);
    expect(overlaps(labelBox, fieldBox)).toBe(false);
    expect(overlaps(labelBox, markerBox)).toBe(false);
  }
  expect(overlaps(playbackBox, layoutBox)).toBe(false);
  expect(overlaps(layoutBox, actionBox)).toBe(false);
  expect(overlaps(backBox, layoutBox)).toBe(false);
  expect(overlaps(progressiveBox, layoutBox)).toBe(false);
  expect(await content.evaluate((element) => element.scrollTop)).toBe(0);

  await expectCenterHitTarget(page, playback);
  await expectCenterHitTarget(page, back);
  await expectCenterHitTarget(page, progressive);
  await expectCenterHitTarget(page, marker);
}

test.describe("field (Option 3)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("field primary action stays in the bottom region across note and enablement states", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Whole field");

    const label = "Look closely at this area";
    const initialTop = await primaryActionTop(page, label);
    await expect(page.getByRole("button", { name: label })).toBeDisabled();

    await chooseHelpAction(page, "Can't hear this");
    await expect(page.getByText(/worth telling us/)).toBeVisible();
    expect(await primaryActionTop(page, label)).toBe(initialTop);

    await page.getByRole("button", { name: "Play the sound" }).click();
    await expect(page.getByRole("button", { name: label })).toBeEnabled();
    expect(await primaryActionTop(page, label)).toBe(initialTop);
  });

  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 }
  ]) {
    test(`complete field and controls fit and operate at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seed(page);
      await jumpTo(page, "Whole field");
      await expectCompleteFieldFit(page, viewport);

      // The marker remains pointer-reachable across the usable square.
      const fieldBox = await page.locator("[data-field]").boundingBox();
      await drag(page, fieldBox.x + fieldBox.width - 3, fieldBox.y + 3);
      let d = await dState(page);
      expect(d.x).toBeGreaterThan(.95);
      expect(d.y).toBeLessThan(.05);

      // Playback works from the keyboard and pointer; the progressive and
      // fixed Back actions remain keyboard-operable without covering the field.
      const playback = page.locator("[data-field-playback]");
      await playback.focus();
      await page.keyboard.press("Enter");
      await expect.poll(() => playing(page)).toBe("dfield");
      await playback.click();
      await expect.poll(() => playing(page)).toBe(null);
      await playback.click();
      await expect.poll(() => playing(page)).toBe("dfield");
      const progressive = page.getByRole("button", { name: "Look closely at this area" });
      await expect(progressive).toBeEnabled();
      await progressive.focus();
      await page.keyboard.press("Enter");
      d = await dState(page);
      expect(d.level).toBe(1);
      await expectCompleteFieldFit(page, viewport);

      const back = page.getByRole("button", { name: "Back", exact: true });
      await back.focus();
      await page.keyboard.press("Enter");
      d = await dState(page);
      expect(d.level).toBe(0);
      await expect(page.getByText(/Back to the whole range/)).toBeVisible();
      await expectCompleteFieldFit(page, viewport);
    });
  }

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
    // The grid layer visibly scales up (1/.38) while the same owner keeps
    // sounding with the zoomed position and the destination remains heard.
    await expect(page.locator("[data-field-grid]")).toHaveCSS("transform", /matrix\(2\.63/);
    expect(await playing(page)).toBe("dfield");
    await expect(page.getByRole("button", { name: "Stop the sound" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Look closely at this area" })).toBeEnabled();

    await page.getByRole("button", { name: "Look closely at this area" }).click();
    d = await dState(page);
    expect(d.level).toBe(2);
    expect(await playing(page)).toBe("dfield");
    await expect(page.getByText("Closer still")).toBeVisible();
    await expect(page.locator("[data-field-grid]")).toHaveCSS("transform", /matrix\(6\.66/);
    await expect(page.locator("[data-field-region]")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "This sound is close" })).toBeVisible();
    await expect(page.getByText("This sounds like my tinnitus", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "This sound is close" }).click();
    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    await expect(page.getByText("Stop Sound", { exact: true })).toBeVisible();
    await expect.poll(() => playing(page)).toBe("dfield");
  });

  test("field completion is participant-confirmed into shared confidence and match complete", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Closer look · closest");
    await page.getByRole("button", { name: "This sound is close" }).click();
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
    await page.getByRole("button", { name: "Play from here" }).click();
    await expect.poll(() => playing(page)).toBe("dfield");

    await chooseHelpAction(page, "Can't hear this");
    await expect(page.getByText(/okay, and worth telling us/)).toBeVisible();
    await expect(page.getByText(/moving the marker higher/)).toBeVisible();
    // Still on the same runnable stage with its existing owner active.
    await expect.poll(() => playing(page)).toBe("dfield");
    await expect(page.getByRole("button", { name: "Stop the sound" })).toBeVisible();

    await page.getByRole("button", { name: "Start over" }).click();
    await expect(page.getByText("Move around and listen")).toBeVisible();
    const d = await dState(page);
    expect(d.level).toBe(0);
    expect(d.x).toBe(.5);
    expect(d.heard).toBe(false);
    await expect.poll(() => playing(page)).toBe(null);
    await expect(page.getByRole("button", { name: "Look closely at this area" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Play the sound" })).toBeVisible();
  });

  test("field Back steps out one zoom level and keeps the marker and sound active", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Whole field");
    await page.getByRole("button", { name: "Play the sound" }).click();
    await page.getByRole("button", { name: "Look closely at this area" }).click();
    await page.getByRole("button", { name: "Look closely at this area" }).click();
    await expect(page.getByText("Closer still")).toBeVisible();

    await page.getByRole("button", { name: "Back" }).click();
    let d = await dState(page);
    expect(d.level).toBe(1);
    await expect(page.getByText(/Back out one step/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Stop the sound" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Look closely at this area" })).toBeEnabled();
    expect(await playing(page)).toBe("dfield");

    await page.getByRole("button", { name: "Back" }).click();
    d = await dState(page);
    expect(d.level).toBe(0);
    expect(d.x).toBe(.5);
    await expect(page.getByText(/Back to the whole range/)).toBeVisible();
    expect(await playing(page)).toBe("dfield");

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
  });
});
