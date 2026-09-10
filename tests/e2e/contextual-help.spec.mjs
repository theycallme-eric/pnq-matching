import { test, expect } from "@playwright/test";
import { expectSeparatedFooterTargets } from "./footer-target-helpers.mjs";

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

async function openHelp(page, actions) {
  const footer = page.locator("[data-shell-footer]");
  const back = footer.getByRole("button", { name: "Back", exact: true });
  const help = footer.getByRole("button", { name: "Help", exact: true });

  await expect(back).toBeVisible();
  await expect(help).toBeVisible();
  await expect(help).toHaveCSS("min-height", await back.evaluate((node) => getComputedStyle(node).minHeight));
  await expect(help).toHaveCSS("color", await back.evaluate((node) => getComputedStyle(node).color));
  await expect(page.locator("[data-screen]").getByRole("button", { name: "Wider range", exact: true })).toHaveCount(0);
  await expect(page.locator("[data-screen]").getByRole("button", { name: "Can't hear this", exact: true })).toHaveCount(0);

  await expectSeparatedFooterTargets(page);

  await help.click();
  const dialog = page.getByRole("dialog", { name: "Help" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-help-actions] > button")).toHaveText(actions);
  return dialog;
}

const appState = (page) => page.evaluate(() => window.__pnqAppState());

test.describe("contextual matching help", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("narrowing exposes only the actions available to the current pass", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Volume");

    let dialog = await openHelp(page, ["Can't hear this"]);
    await dialog.getByRole("button", { name: "Can't hear this", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("That’s okay. We made the sound a little easier to hear. Press play and try again.")).toBeVisible();
    expect((await appState(page)).n.level).toBeCloseTo(.52, 6);

    await jumpTo(page, "Pitch · fine");
    dialog = await openHelp(page, ["Wider range", "Can't hear this"]);
    await dialog.getByRole("button", { name: "Wider range", exact: true }).click();
    await expect(page.getByText("Now find the pitch")).toBeVisible();
    await expect(page.getByText("We’ve widened the pitch range again. Take your time. Close is good enough at this stage.")).toBeVisible();
    expect((await appState(page)).n.widened).toBe(1);
  });

  test("comparison, field, and adaptive screens offer only their former audibility action", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Directional · volume");

    let dialog = await openHelp(page, ["Can't hear this"]);
    await dialog.getByRole("button", { name: "Can't hear this", exact: true }).click();
    await expect(page.getByText(/made it a little easier to hear/)).toBeVisible();
    expect((await appState(page)).r.level).toBeCloseTo(.52, 6);

    await jumpTo(page, "Closer look");
    dialog = await openHelp(page, ["Can't hear this"]);
    await dialog.getByRole("button", { name: "Can't hear this", exact: true }).click();
    await expect(page.getByText(/moving the marker higher/)).toBeVisible();
    expect((await appState(page)).stages.d).toBe("zoom");

    await jumpTo(page, "Broad start");
    dialog = await openHelp(page, ["Can't hear this"]);
    await dialog.getByRole("button", { name: "Can't hear this", exact: true }).click();
    await expect(page.getByText("We made it a little easier to hear. Try again.")).toBeVisible();
    expect((await appState(page)).a.level).toBeCloseTo(.57, 6);
  });
});
