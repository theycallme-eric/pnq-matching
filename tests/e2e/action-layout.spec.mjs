import { test, expect } from "@playwright/test";
import { openSessionMenu } from "./onboarding-helpers.mjs";

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
  await openSessionMenu(page);
  await page.getByRole("button", { name: "Jump to a different section" }).click();
  const section = page.getByText(group, { exact: true }).locator("..");
  await section.getByRole("button", { name: label, exact: true }).click();
}

async function actionGeometry(page, lowestActionName) {
  const region = page.locator("[data-screen-action-region]");
  const navigation = page.locator("[data-session-navigation]");
  const action = region.getByRole("button", { name: lowestActionName, exact: true });

  await expect(region).toHaveCount(1);
  await expect(region).toBeVisible();
  await expect(navigation).toBeVisible();
  await expect(action).toBeVisible();

  const geometry = await region.evaluate((element, actionName) => {
    const action = [...element.querySelectorAll("button")]
      .find((button) => button.textContent.trim() === actionName);
    const scrollRegion = element.parentElement.querySelector('[style*="overflow-y: auto"]');
    const regionRect = element.getBoundingClientRect();
    const actionRect = action.getBoundingClientRect();
    const screenRect = element.closest("[data-screen]").getBoundingClientRect();
    const navigationRect = element.closest("[data-device-frame]")
      .querySelector("[data-session-navigation]").getBoundingClientRect();

    return {
      regionTop: regionRect.top,
      regionBottom: regionRect.bottom,
      actionTop: actionRect.top,
      actionBottom: actionRect.bottom,
      screenBottom: screenRect.bottom,
      navigationBottom: navigationRect.bottom,
      bottomGap: screenRect.bottom - actionRect.bottom,
      regionInsideScreen: regionRect.top >= navigationRect.bottom - 0.5
        && regionRect.bottom <= screenRect.bottom + 0.5,
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
  expect(geometry.actionBottom).toBeLessThanOrEqual(geometry.screenBottom);
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

async function expectComparisonOutcomeStack(page, labels) {
  const stack = page.locator("[data-comparison-outcomes]");
  const actions = stack.getByRole("button");

  await expect(stack).toHaveCount(1);
  await expect(actions).toHaveText(labels);

  const layout = await stack.evaluate((element) => {
    const stackRect = element.getBoundingClientRect();
    const content = element.closest("[data-screen]")
      .querySelector('[style*="overflow-y: auto"]');
    const contentRect = content.getBoundingClientRect();
    const buttons = [...element.querySelectorAll("button")].map((button) => {
      const buttonRect = button.getBoundingClientRect();
      const label = button.querySelector("span");
      const labelRect = label.getBoundingClientRect();
      const labelRange = document.createRange();
      labelRange.selectNodeContents(label);
      return {
        x: buttonRect.x,
        top: buttonRect.top,
        right: buttonRect.right,
        bottom: buttonRect.bottom,
        width: buttonRect.width,
        fontSize: parseFloat(getComputedStyle(button).fontSize),
        lineCount: labelRange.getClientRects().length,
        labelInsideButton: labelRect.left >= buttonRect.left - 0.5
          && labelRect.right <= buttonRect.right + 0.5
          && labelRect.top >= buttonRect.top - 0.5
          && labelRect.bottom <= buttonRect.bottom + 0.5,
        noOverflow: button.scrollWidth <= button.clientWidth + 1
          && button.scrollHeight <= button.clientHeight + 1
      };
    });
    return {
      stack: {
        left: stackRect.left,
        right: stackRect.right,
        top: stackRect.top,
        bottom: stackRect.bottom,
        noOverflow: element.scrollWidth <= element.clientWidth + 1
      },
      contentDoesNotOverlap: contentRect.bottom <= stackRect.top + 0.5,
      contentCanScroll: getComputedStyle(content).overflowY === "auto",
      buttons
    };
  });

  expect(layout.stack.noOverflow).toBe(true);
  expect(layout.contentDoesNotOverlap).toBe(true);
  expect(layout.contentCanScroll).toBe(true);
  for (const [index, button] of layout.buttons.entries()) {
    expect(button.fontSize).toBe(14);
    expect(button.lineCount).toBe(1);
    expect(button.labelInsideButton).toBe(true);
    expect(button.noOverflow).toBe(true);
    expect(button.x).toBeCloseTo(layout.buttons[0].x, 0);
    expect(button.width).toBeCloseTo(layout.buttons[0].width, 0);
    if (index > 0) {
      expect(layout.buttons[index - 1].bottom).toBeLessThanOrEqual(button.top + 0.5);
    }
  }
  expect(layout.buttons[0].x).toBeCloseTo(layout.stack.left, 0);
  expect(layout.buttons[0].right).toBeCloseTo(layout.stack.right, 0);

  return layout;
}

const stepScenarios = [
  ["OPTION 1", "Volume", "This volume is close"],
  ["OPTION 1", "Pitch · coarse", "Next: closer adjustments"],
  ["OPTION 1", "Pitch · medium", "Next: fine adjustments"],
  ["OPTION 1", "Pitch · fine", "This pitch is close"],
  ["OPTION 3", "Whole field", "Look closely at this area"],
  ["OPTION 3", "Closer look", "Look closely at this area"],
  ["OPTION 3", "Closer look · closest", "This sound is close"]
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
      ["OPTION 2", "Directional · volume", "This volume is close"],
      ["OPTION 2", "Directional · pitch", "This pitch is close"],
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

  test("Option 2 outcomes stay vertically stacked through every comparison gate state", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "OPTION 2", "Directional · volume");
    const reference = await actionGeometry(page, "This volume is close");

    await jumpTo(page, "OPTION 2", "A/B comparisons");
    const labels = ["Neither is close", "They sound the same"];
    const baselineLayout = await expectComparisonOutcomeStack(page, labels);
    expect((await actionGeometry(page, labels.at(-1))).bottomGap).toBeCloseTo(reference.bottomGap, 0);

    await page.getByRole("button", { name: "Play sound 1" }).click();
    expect((await expectComparisonOutcomeStack(page, labels)).buttons).toEqual(baselineLayout.buttons);

    await jumpTo(page, "OPTION 2", "A/B comparisons");
    await page.getByRole("button", { name: "Play sound 2" }).click();
    expect((await expectComparisonOutcomeStack(page, labels)).buttons).toEqual(baselineLayout.buttons);

    await page.getByRole("button", { name: "Play sound 1" }).click();
    const readyLayout = await expectComparisonOutcomeStack(page, labels);
    expect(readyLayout.buttons).toEqual(baselineLayout.buttons);

    await page.getByRole("button", { name: "This one" }).first().click();
    expect((await expectComparisonOutcomeStack(page, labels)).buttons).toEqual(baselineLayout.buttons);
  });

  for (const viewport of [
    { width: 390, height: 844, mode: "bare" },
    { width: 320, height: 568, mode: "bare" },
    { width: 1024, height: 900, mode: "framed" }
  ]) {
    test(`Option 2 outcome labels fit the stable bottom stack at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await seed(page);
      await jumpTo(page, "OPTION 2", "Directional · volume");
      const reference = await actionGeometry(page, "This volume is close");
      let twoActionLayout;

      for (const scenario of [
        ["A/B comparisons", ["Neither is close", "They sound the same"]],
        ["A/B · long session", ["Neither is close", "They sound the same", "Finish from my best match"]]
      ]) {
        const [stage, labels] = scenario;
        await jumpTo(page, "OPTION 2", stage);
        await expect(page.locator("[data-device-frame]")).toHaveAttribute("data-device-frame", viewport.mode);
        const layout = await expectComparisonOutcomeStack(page, labels);
        const geometry = await actionGeometry(page, labels.at(-1));
        expect(geometry.bottomGap).toBeCloseTo(reference.bottomGap, 0);
        if (labels.length === 2) {
          twoActionLayout = layout;
        } else {
          expect(layout.stack.bottom).toBeCloseTo(twoActionLayout.stack.bottom, 0);
          expect(layout.stack.top).toBeLessThan(twoActionLayout.stack.top);
        }
      }
    });
  }
});
