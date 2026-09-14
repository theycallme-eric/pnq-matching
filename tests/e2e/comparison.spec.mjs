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

const rState = (page) => page.evaluate(() => window.__pnqAppState().r);

test.describe("comparison (Option 2)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("directional primary action stays in the bottom region across content and enablement states", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Directional · volume");

    const label = "This volume is close";
    const initialTop = await primaryActionTop(page, label);
    await expect(page.getByRole("button", { name: label })).toBeDisabled();

    await chooseHelpAction(page, "Can't hear this");
    await expect(page.getByText(/made it a little easier to hear/)).toBeVisible();
    expect(await primaryActionTop(page, label)).toBe(initialTop);

    await page.getByText("Start Sound", { exact: true }).click();
    await expect(page.getByRole("button", { name: label })).toBeEnabled();
    expect(await primaryActionTop(page, label)).toBe(initialTop);
  });

  test("directional answers adjust level then pitch with halving steps into A/B", async ({ page }) => {
    await seed(page);
    await page.goto("/");
    await startMatchingOption(page, 2);
    await expect(page.locator('[data-screen-label="Shared · Listen and respond"]')).toBeVisible();

    const louder = page.getByRole("button", { name: "Mine is louder" });
    await expect(louder).toBeDisabled();
    await expect(page.getByRole("button", { name: "This volume is close" })).toBeDisabled();

    await page.getByText("Start Sound", { exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("main");
    await expect(louder).toBeEnabled();

    await louder.click();
    let r = await rState(page);
    expect(r.level).toBeCloseTo(.58, 6);
    expect(r.lstep).toBeCloseTo(.108, 6);
    await louder.click();
    r = await rState(page);
    expect(r.level).toBeCloseTo(.688, 6);
    expect(r.lstep).toBeCloseTo(.0648, 6);

    await page.getByRole("button", { name: "This volume is close" }).click();
    r = await rState(page);
    expect(r.phase).toBe("pitch");

    // The one directional Play carries into pitch, where the live candidate
    // is already heard and can keep changing without another Play.
    const higher = page.getByRole("button", { name: "Mine is higher" });
    await expect(higher).toBeEnabled();
    await expect(page.getByText("Stop Sound", { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("main");

    await higher.click();
    r = await rState(page);
    expect(r.center).toBeCloseTo(.7, 6);
    expect(r.pstep).toBeCloseTo(.12, 6);

    const settle = page.getByRole("button", { name: "This pitch is close" });
    await settle.click();
    await settle.click();
    await expect(page.locator('[data-screen-label="Shared · Two-sound comparison"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Play sound 1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play sound 2" })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
    expect(await page.evaluate(() => {
      const s = window.__pnqAppState();
      return [s.prKey, s.prHeardA, s.prHeardB];
    })).toEqual([null, false, false]);
    await expect(page.getByText("The volume is set, move on", { exact: true })).toHaveCount(0);
    await expect(page.getByText("The pitch is set, finish up", { exact: true })).toHaveCount(0);
    r = await rState(page);
    expect(r.spread).toBeCloseTo(.216, 6);
    expect(r.round).toBe(1);
  });

  test("A/B choices unlock only after both sounds play, and a new pair re-locks them", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "A/B comparisons");
    await expect(page.locator('[data-screen-label="Shared · Two-sound comparison"]')).toBeVisible();

    const picks = page.getByRole("button", { name: "This one" });
    await expect(picks).toHaveCount(2);
    await expect(picks.first()).toBeDisabled();
    await expect(picks.nth(1)).toBeDisabled();
    await expect(page.getByText("Play both sounds before choosing.")).toBeVisible();

    const sound1 = page.getByRole("button", { name: "Play sound 1" });
    await expect(sound1).toHaveAttribute("aria-pressed", "false");
    await sound1.click();
    await expect(page.getByRole("button", { name: "Stop sound 1" })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("prA");
    await expect(picks.first()).toBeDisabled();

    await page.getByRole("button", { name: "Play sound 2" }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("prB");
    await expect(picks.first()).toBeEnabled();
    await expect(picks.nth(1)).toBeEnabled();
    await expect(page.getByText("Play both sounds before choosing.")).toHaveCount(0);

    await picks.first().click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("prA");
    const r = await rState(page);
    expect(r.round).toBe(3);
    expect(r.spread).toBeCloseTo(.156, 6);
    expect(r.center).toBeCloseTo(.45, 6);
    await expect(picks.first()).toBeDisabled();
    await expect(picks.nth(1)).toBeDisabled();
    await expect(page.getByText("Play both sounds before choosing.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Stop sound 1" })).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => {
      const s = window.__pnqAppState();
      return [s.prKey, s.prHeardA, s.prHeardB];
    })).toEqual([null, false, false]);

    // The carried selection is not a new-pair audition. Stop it, then play
    // both newly rendered candidates explicitly to unlock the next choice.
    await page.getByRole("button", { name: "Stop sound 1" }).click();
    await page.getByRole("button", { name: "Play sound 1" }).click();
    await expect(picks.first()).toBeDisabled();
    await page.getByRole("button", { name: "Play sound 2" }).click();
    await expect(picks.first()).toBeEnabled();
  });

  test("reaching the spread floor ends the loop into Confidence", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "A/B · near the floor");
    await page.getByRole("button", { name: "Play sound 1" }).click();
    await page.getByRole("button", { name: "Play sound 2" }).click();
    await page.getByRole("button", { name: "This one" }).nth(1).click();
    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    await expect(page.getByText("Stop Sound", { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("prB");
    const r = await rState(page);
    expect(r.stop).toBe("floor");
    expect(r.spread).toBeCloseTo(.045, 6);
  });

  test("saying the two sound the same ends the loop into Confidence", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "A/B comparisons");
    const same = page.getByRole("button", { name: "They sound the same" });
    await expect(same).toBeDisabled();
    await page.getByRole("button", { name: "Play sound 1" }).click();
    await page.getByRole("button", { name: "Play sound 2" }).click();
    await expect(same).toBeEnabled();
    await same.click();
    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    expect((await rState(page)).stop).toBe("same");
  });

  test("two uncertain answers fall back to the directional stage", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "A/B comparisons");
    const auditionPair = async () => {
      await page.getByRole("button", { name: "Play sound 1" }).click();
      await page.getByRole("button", { name: "Play sound 2" }).click();
    };
    const neither = page.getByRole("button", { name: "Neither is close" });
    await expect(neither).toBeDisabled();
    await auditionPair();
    await neither.click();
    await expect(page.getByText(/widened out and moved to a different area/)).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("prB");
    let r = await rState(page);
    expect(r.uncertain).toBe(1);
    expect(r.spread).toBeCloseTo(.4, 6);

    await expect(neither).toBeDisabled();
    await auditionPair();
    await neither.click();
    await expect(page.locator('[data-screen-label="Shared · Listen and respond"]')).toBeVisible();
    await expect(page.getByText(/back to simple directions/)).toBeVisible();
    r = await rState(page);
    expect(r.phase).toBe("pitch");
    expect(r.uncertain).toBe(0);
  });

  test("fatigue finish stays gated by the current pair and carries sound to Confidence", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "A/B · long session");
    const finish = page.getByRole("button", { name: "Finish from my best match" });
    await expect(finish).toBeDisabled();
    await page.getByRole("button", { name: "Play sound 1" }).click();
    await page.getByRole("button", { name: "Play sound 2" }).click();
    await expect(finish).toBeEnabled();
    await finish.click();
    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("prB");
  });

  test("audibility escapes raise the level, reassure, and never dead-end", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "A/B comparisons");
    await chooseHelpAction(page, "Can't hear these sounds");
    await expect(page.locator('[data-screen-label="Shared · Two-sound comparison"]')).toBeVisible();
    await expect(page.getByText(/made the sounds a little easier to hear/)).toBeVisible();
    expect((await rState(page)).level).toBeCloseTo(.58, 6);
    await expect(page.getByRole("button", { name: "This one" }).first()).toBeDisabled();
    await expect(page.getByRole("button", { name: "Neither is close" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "They sound the same" })).toBeDisabled();

    await jumpTo(page, "Directional · volume");
    await expect(page.locator('[data-screen-label="Shared · Listen and respond"]')).toBeVisible();
    await chooseHelpAction(page, "Can't hear this");
    await expect(page.getByText(/made it a little easier to hear/)).toBeVisible();
    expect((await rState(page)).level).toBeCloseTo(.52, 6);
  });
});
