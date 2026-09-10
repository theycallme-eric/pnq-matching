import { test, expect } from "@playwright/test";
import { expectSeparatedFooterTargets } from "./footer-target-helpers.mjs";
import { openSessionMenu } from "./onboarding-helpers.mjs";

async function seed(page) {
  await page.addInitScript(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
    ear: "Both ears", hp: true, vol: 100, setupSeen: true, eduSeen: true, optDone: {}, optOrder: []
  })));
}

async function jumpTo(page, group, label) {
  await page.goto("/");
  await openSessionMenu(page);
  await page.getByRole("button", { name: "Jump to a different section" }).click();
  const section = page.getByText(group, { exact: true }).locator("..");
  await section.getByRole("button", { name: label, exact: true }).click();
}

function stepActions(page) {
  const region = page.locator("[data-step-actions]");
  return {
    region,
    previous: region.locator('[data-step-action="previous"]'),
    next: region.locator('[data-step-action="next"]')
  };
}

async function expectActionRegionSeparated(page) {
  const { region, previous, next } = stepActions(page);
  await expect(region).toBeVisible();
  await expect(previous).toBeVisible();
  await expect(next).toBeVisible();

  const footer = page.locator("[data-shell-footer]");
  const [regionBox, previousBox, nextBox, footerBox] = await Promise.all([
    region.boundingBox(), previous.boundingBox(), next.boundingBox(), footer.boundingBox()
  ]);

  expect(nextBox.y + nextBox.height).toBeLessThanOrEqual(previousBox.y + .5);
  expect(nextBox.x).toBeCloseTo(previousBox.x, 0);
  expect(nextBox.width).toBeCloseTo(previousBox.width, 0);
  expect(regionBox.y + regionBox.height).toBeLessThanOrEqual(footerBox.y + .5);
  expect(previousBox.y + previousBox.height).toBeLessThanOrEqual(footerBox.y);
  expect(nextBox.y + nextBox.height).toBeLessThanOrEqual(footerBox.y);
  await expectSeparatedFooterTargets(page);
}

test.describe("matching stepper navigation (REQ-014)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("narrowing pairs Previous and Next while keeping first-step and heard gating", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "OPTION 1", "Volume");

    let actions = stepActions(page);
    await expect(actions.previous).toHaveText("Previous step");
    await expect(actions.previous).toBeDisabled();
    await expect(actions.next).toHaveText("The volume is about right");
    await expect(actions.next).toBeDisabled();
    await expectActionRegionSeparated(page);

    const disabledStyle = await actions.next.evaluate((button) => {
      const probe = document.createElement("div");
      probe.style.background = "var(--interface-disabled)";
      document.body.appendChild(probe);
      const standardBackground = getComputedStyle(probe).backgroundColor;
      probe.remove();
      const style = getComputedStyle(button);
      return {
        background: style.backgroundColor,
        borderStyle: style.borderStyle,
        boxShadow: style.boxShadow,
        standardBackground
      };
    });
    expect(disabledStyle.background).toBe(disabledStyle.standardBackground);
    expect(disabledStyle.borderStyle).toBe("none");
    expect(disabledStyle.boxShadow).toBe("none");

    await jumpTo(page, "OPTION 1", "Pitch · coarse");
    actions = stepActions(page);
    await expect(actions.previous).toBeEnabled();
    await actions.previous.click();
    let state = await page.evaluate(() => window.__pnqAppState());
    expect(state.screen).toBe("flow");
    expect(state.concept).toBe("n");
    expect(state.stages.n).toBe("vol");

    await jumpTo(page, "OPTION 1", "Pitch · coarse");
    actions = stepActions(page);
    await expect(actions.next).toBeDisabled();
    await page.getByText("Start Sound", { exact: true }).click();
    await expect(actions.next).toBeEnabled();
    await actions.next.click();
    state = await page.evaluate(() => window.__pnqAppState());
    expect(state.stages.n).toBe("p2");

    actions = stepActions(page);
    await actions.previous.click();
    state = await page.evaluate(() => window.__pnqAppState());
    expect(state.stages.n).toBe("p1");

    // Extra fine-tuning passes share the p3 route, but Previous still moves
    // through them individually before returning to the medium pass.
    await jumpTo(page, "OPTION 1", "Extended · 5 passes");
    actions = stepActions(page);
    await actions.previous.click();
    state = await page.evaluate(() => window.__pnqAppState());
    expect(state.stages.n).toBe("p3");
    expect(state.n.extra).toBe(1);
    await stepActions(page).previous.click();
    state = await page.evaluate(() => window.__pnqAppState());
    expect(state.stages.n).toBe("p3");
    expect(state.n.extra).toBe(0);
    await stepActions(page).previous.click();
    state = await page.evaluate(() => window.__pnqAppState());
    expect(state.stages.n).toBe("p2");
  });

  test("field Previous moves back one refinement level and remains separate from the footer", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "OPTION 3", "Whole field");
    let actions = stepActions(page);
    await expect(actions.previous).toBeDisabled();
    await expect(actions.next).toBeDisabled();
    await expectActionRegionSeparated(page);

    await jumpTo(page, "OPTION 3", "Closer look · closest");

    actions = stepActions(page);
    await expect(actions.previous).toHaveText("Previous step");
    await expect(actions.previous).toBeEnabled();
    await expect(actions.next).toHaveText("This sounds like my tinnitus");
    await expectActionRegionSeparated(page);

    await actions.previous.click();
    let state = await page.evaluate(() => window.__pnqAppState());
    expect(state.screen).toBe("flow");
    expect(state.concept).toBe("d");
    expect(state.stages.d).toBe("zoom");
    expect(state.d.level).toBe(1);

    actions = stepActions(page);
    await expect(actions.next).toBeDisabled();
    await page.getByRole("button", { name: "Play the sound" }).click();
    await expect(actions.next).toBeEnabled();
    await actions.next.click();
    state = await page.evaluate(() => window.__pnqAppState());
    expect(state.d.level).toBe(2);
  });
});
