import { test, expect } from "@playwright/test";

const seededSession = {
  ear: "Both ears",
  hp: true,
  vol: 100,
  setupSeen: true,
  eduSeen: true,
  optDone: {},
  optOrder: []
};

async function seed(page) {
  await page.addInitScript((session) => {
    sessionStorage.setItem("pnq-mtp-v1", JSON.stringify(session));
  }, seededSession);
}

async function jumpTo(page, group, label) {
  await page.goto("/");
  await page.getByRole("button", { name: "Session menu" }).click();
  await page.getByRole("button", { name: "Jump to a different section" }).click();
  const section = page.getByText(group, { exact: true }).locator("..");
  await section.getByRole("button", { name: label, exact: true }).click();
}

async function actionGeometry(page, lowestActionName) {
  const region = page.locator("[data-screen-action-region]");
  const footer = page.locator("[data-shell-footer]");
  const action = region.getByRole("button", { name: lowestActionName, exact: true });

  await expect(region).toHaveCount(1);
  await expect(region).toBeVisible();
  await expect(footer).toBeVisible();
  await expect(action).toBeVisible();

  const geometry = await region.evaluate((element, actionName) => {
    const action = [...element.querySelectorAll("button")]
      .find((button) => button.textContent.trim() === actionName);
    const scrollRegion = element.parentElement.querySelector('[style*="overflow-y: auto"]');
    const regionRect = element.getBoundingClientRect();
    const actionRect = action.getBoundingClientRect();
    const footerRect = element.parentElement.parentElement
      .querySelector("[data-shell-footer]").getBoundingClientRect();

    return {
      regionTop: regionRect.top,
      regionBottom: regionRect.bottom,
      actionTop: actionRect.top,
      actionBottom: actionRect.bottom,
      footerTop: footerRect.top,
      bottomGap: footerRect.top - actionRect.bottom,
      regionInsideScreen: regionRect.bottom <= footerRect.top + 0.5,
      actionInsideRegion: actionRect.top >= regionRect.top - 0.5
        && actionRect.bottom <= regionRect.bottom + 0.5,
      contentCanScroll: scrollRegion
        ? getComputedStyle(scrollRegion).overflowY === "auto"
        : false,
      noHorizontalOverflow: element.scrollWidth <= element.clientWidth + 1
    };
  }, lowestActionName);

  expect(geometry.regionInsideScreen).toBe(true);
  expect(geometry.actionInsideRegion).toBe(true);
  expect(geometry.contentCanScroll).toBe(true);
  expect(geometry.noHorizontalOverflow).toBe(true);
  expect(geometry.actionBottom).toBeLessThanOrEqual(geometry.footerTop);
  return geometry;
}

async function expectReadableButton(button) {
  await expect(button).toBeVisible();
  const readability = await button.evaluate((element) => {
    const label = element.querySelector("span") || element;
    return {
      fontSize: parseFloat(getComputedStyle(element).fontSize),
      buttonFits: element.scrollWidth <= element.clientWidth + 1
        && element.scrollHeight <= element.clientHeight + 1,
      labelFits: label.scrollWidth <= label.clientWidth + 1
        && label.scrollHeight <= label.clientHeight + 1
    };
  });
  expect(readability.fontSize).toBeGreaterThanOrEqual(17);
  expect(readability.buttonFits).toBe(true);
  expect(readability.labelFits).toBe(true);
}

async function expectVerticalStepActions(page, nextLabel) {
  const region = page.locator("[data-step-actions]");
  const next = region.locator('[data-step-action="next"]');
  const previous = region.locator('[data-step-action="previous"]');

  await expect(next).toHaveText(nextLabel);
  await expect(next).toHaveAttribute("data-pnq-variant", "primary");
  await expect(previous).toHaveText("Previous step");
  await expect(previous).toHaveAttribute("data-pnq-variant", "outline");
  await expectReadableButton(next);
  await expectReadableButton(previous);

  const [nextBox, previousBox] = await Promise.all([
    next.boundingBox(),
    previous.boundingBox()
  ]);
  expect(nextBox.y + nextBox.height).toBeLessThanOrEqual(previousBox.y + 0.5);
  expect(nextBox.x).toBeCloseTo(previousBox.x, 0);
  expect(nextBox.width).toBeCloseTo(previousBox.width, 0);
}

const stepScenarios = [
  ["OPTION 1", "Volume", "The volume is about right"],
  ["OPTION 1", "Pitch · coarse", "Next: closer adjustments"],
  ["OPTION 1", "Pitch · medium", "Next: fine adjustments"],
  ["OPTION 1", "Pitch · fine", "This matches what I hear"],
  ["OPTION 3", "Whole field", "Look closely at this area"],
  ["OPTION 3", "Closer look", "Look closely at this area"],
  ["OPTION 3", "Closer look · closest", "This sounds like my tinnitus"]
];

test.describe("matching action layout (REQ-001, REQ-004, REQ-005)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("all affected matching steps share the completion screen's lowest-action anchor", async ({ page }) => {
    test.setTimeout(60000);
    await seed(page);

    await jumpTo(page, "OPTION 1", "Confidence");
    await page.getByRole("button", { name: "Very close", exact: true }).click();
    await page.getByRole("button", { name: "Finish matching" }).click();
    const reference = await actionGeometry(page, "Return to matching options");

    const singleActionScenarios = [
      ["OPTION 2", "Directional · volume", "The volume is set, move on"],
      ["OPTION 2", "Directional · pitch", "The pitch is set, finish up"],
      ["OPTION 1", "Confidence", "Finish matching"],
      ["OPTION 2", "Confidence", "Finish matching"],
      ["OPTION 3", "Confidence", "Finish matching"]
    ];

    for (const [group, stage, action] of singleActionScenarios) {
      await jumpTo(page, group, stage);
      const geometry = await actionGeometry(page, action);
      expect(geometry.bottomGap).toBeCloseTo(reference.bottomGap, 0);
    }

    for (const [group, stage] of stepScenarios) {
      await jumpTo(page, group, stage);
      const geometry = await actionGeometry(page, "Previous step");
      expect(geometry.bottomGap).toBeCloseTo(reference.bottomGap, 0);
    }

    for (const group of ["OPTION 1", "OPTION 2", "OPTION 3"]) {
      await jumpTo(page, group, "Confidence");
      await page.getByRole("button", { name: "Very close", exact: true }).click();
      await page.getByRole("button", { name: "Finish matching" }).click();
      const geometry = await actionGeometry(page, "Return to matching options");
      expect(geometry.bottomGap).toBeCloseTo(reference.bottomGap, 0);
    }
  });

  for (const viewport of [
    { width: 390, height: 844 },
    { width: 320, height: 568 }
  ]) {
    test(`progressive/Previous pairs stack without squeezed labels at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seed(page);

      for (const [group, stage, nextLabel] of stepScenarios) {
        await jumpTo(page, group, stage);
        await expectVerticalStepActions(page, nextLabel);
        await actionGeometry(page, "Previous step");
      }
    });
  }

  test("stacking preserves progressive and Previous step navigation", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "OPTION 1", "Pitch · coarse");

    await page.getByText("Start Sound", { exact: true }).click();
    await page.locator('[data-step-action="next"]').click();
    expect(await page.evaluate(() => window.__pnqAppState().stages.n)).toBe("p2");

    await page.locator('[data-step-action="previous"]').click();
    expect(await page.evaluate(() => window.__pnqAppState().stages.n)).toBe("p1");
  });
});
