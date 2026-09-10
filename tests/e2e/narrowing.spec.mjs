/*
 * End-to-end tests for Option 1 - Progressive Narrowing (REQ-007, REQ-016):
 * the fixed stage order, the tightening range visuals with fixed ticks, and
 * the widen / can't-hear escapes.
 */
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

const nState = (page) => page.evaluate(() => window.__pnqAppState().n);
const playingKey = (page) => page.evaluate(() => window.__pnqAudioEngine.playingKey());
const layerStyle = (page) => page.locator("[data-tick-layer]").evaluate((el) => ({ left: el.style.left, width: el.style.width }));
const progressPhase = (page) => page.locator("[data-progress]").innerText();

test.describe("narrowing (Option 1)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("narrowing primary action stays in the bottom region across pass states", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Volume");

    const volumeLabel = "The volume is about right";
    const initialTop = await primaryActionTop(page, volumeLabel);
    await expect(page.getByRole("button", { name: volumeLabel })).toBeDisabled();

    await page.getByRole("button", { name: "Can't hear this" }).click();
    await expect(page.getByText(/made the sound a little easier to hear/)).toBeVisible();
    expect(await primaryActionTop(page, volumeLabel)).toBe(initialTop);

    await page.getByText("Start Sound", { exact: true }).click();
    await expect(page.getByRole("button", { name: volumeLabel })).toBeEnabled();
    expect(await primaryActionTop(page, volumeLabel)).toBe(initialTop);

    await jumpTo(page, "Pitch · fine");
    expect(await primaryActionTop(page, "This matches what I hear")).toBe(initialTop);
  });

  test("stage order runs volume then three tightening pitch passes into shared confidence", async ({ page }) => {
    await seed(page);
    await page.goto("/");
    await startMatchingOption(page, 1);
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();

    // Volume first: the sign-off is heard-gated and the header says VOLUME.
    await expect(page.getByText("Start with how loud it is")).toBeVisible();
    expect(await progressPhase(page)).toContain("VOLUME");
    const volOff = page.getByRole("button", { name: "The volume is about right" });
    await expect(volOff).toBeDisabled();
    await page.getByText("Start Sound", { exact: true }).click();
    await expect.poll(() => playingKey(page)).toBe("main");
    await expect(volOff).toBeEnabled();
    await volOff.click();

    // Every stage transition hard-stops audio and the new stage must be played
    // before it can be judged (REQ-001, REQ-018).
    await expect(page.getByText("Now find the pitch")).toBeVisible();
    expect(await playingKey(page)).toBe(null);
    expect(await progressPhase(page)).toContain("PITCH 1 OF 3");

    // Choose a pitch on the coarse pass; adjustments carry into the tone only
    // while this stage's sound is playing.
    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("slider", { name: "Pitch" }).fill("70");
    expect((await nState(page)).pitch).toBeCloseTo(.7, 6);
    await page.getByRole("button", { name: "Next: closer adjustments" }).click();

    await expect(page.getByText("Getting closer")).toBeVisible();
    expect(await playingKey(page)).toBe(null);
    expect(await progressPhase(page)).toContain("PITCH 2 OF 3");
    let n = await nState(page);
    expect(n.center).toBeCloseTo(.7, 6);
    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("button", { name: "Next: fine adjustments" }).click();

    await expect(page.getByText("Small adjustments now")).toBeVisible();
    expect(await playingKey(page)).toBe(null);
    expect(await progressPhase(page)).toContain("PITCH 3 OF 3");
    await expect(page.getByRole("button", { name: "Keep fine-tuning" })).toBeVisible();

    // The fixed sign-off ends in shared Confidence with the final pitch/level.
    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("button", { name: "This matches what I hear" }).click();
    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    n = await nState(page);
    expect(n.pitch).toBeCloseTo(.7, 6);
    expect(n.level).toBeCloseTo(.4, 6);
  });

  test("range tightens around the choice while ticks stay fixed and the layer scales", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Pitch · coarse");
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();

    // Coarse pass: 26 fixed ticks, the layer covering the whole range.
    await expect(page.locator("[data-tick]")).toHaveCount(26);
    const ticks = await page.locator("[data-tick]").evaluateAll((els) => els.map((el) => el.style.left));
    expect(ticks[0]).toBe("0%");
    expect(ticks[25]).toBe("100%");
    expect(parseFloat((await layerStyle(page)).width)).toBeCloseTo(100, 2);

    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("slider", { name: "Pitch" }).fill("70");
    await page.getByRole("button", { name: "Next: closer adjustments" }).click();

    // Medium pass: the window band tightens around .7 and the tick layer
    // scales; the tick elements keep their positions inside it.
    await expect(page.getByText("Getting closer")).toBeVisible();
    let layer = await layerStyle(page);
    expect(parseFloat(layer.width)).toBeCloseTo(312.5, 2);
    expect(parseFloat(layer.left)).toBeCloseTo(-168.75, 2);
    const again = await page.locator("[data-tick]").evaluateAll((els) => els.map((el) => el.style.left));
    expect(again).toEqual(ticks);
    const band = await page.locator("[data-pitch-window]").evaluate((el) => ({ left: el.style.left, width: el.style.width }));
    expect(parseFloat(band.left)).toBeCloseTo(54, 2);
    expect(parseFloat(band.width)).toBeCloseTo(32, 2);

    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("button", { name: "Next: fine adjustments" }).click();
    await expect(page.getByText("Small adjustments now")).toBeVisible();
    layer = await layerStyle(page);
    expect(parseFloat(layer.width)).toBeCloseTo(1000, 2);
    expect(parseFloat(layer.left)).toBeCloseTo(-650, 2);

    // Step buttons nudge by 16% of the pass's half-width.
    await page.getByLabel("Pitch up").click();
    expect((await nState(page)).pitch).toBeCloseTo(.7 + .05 * .16, 6);
    await page.getByLabel("Pitch down").click();
    expect((await nState(page)).pitch).toBeCloseTo(.7, 6);

    // Keep fine-tuning: a narrower extra pass, reflected in the header.
    await page.getByRole("button", { name: "Keep fine-tuning" }).click();
    expect(await progressPhase(page)).toContain("PITCH 4 OF 4");
    await expect(page.getByText("Another pass, narrower again. Keep going for as long as it helps.")).toBeVisible();
    expect(parseFloat((await layerStyle(page)).width)).toBeCloseTo(1666.67, 2);
  });

  test("wider range reopens the coarse pass with its reassurance note, still runnable", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "Pitch · fine");
    await expect(page.getByText("Small adjustments now")).toBeVisible();

    await page.getByRole("button", { name: "Wider range" }).click();
    await expect(page.getByText("Now find the pitch")).toBeVisible();
    expect(await progressPhase(page)).toContain("PITCH 1 OF 3");
    await expect(page.getByText("We’ve widened the pitch range again. Take your time. Close is good enough at this stage.")).toBeVisible();
    const n = await nState(page);
    expect(n.widened).toBe(1);
    expect(n.extra).toBe(0);

    // No error framing, and the stage still plays sound.
    await page.getByText("Start Sound", { exact: true }).click();
    await expect.poll(() => playingKey(page)).toBe("main");
    await expect(page.getByRole("button", { name: "Next: closer adjustments" })).toBeEnabled();
  });

  test("can't hear this raises the level, reassures, and never leaves the stage", async ({ page }) => {
    await seed(page);
    await page.goto("/");
    await startMatchingOption(page, 1);

    await page.getByRole("button", { name: "Can't hear this" }).click();
    await expect(page.getByText("That’s okay. We made the sound a little easier to hear. Press play and try again.")).toBeVisible();
    let n = await nState(page);
    expect(n.level).toBeCloseTo(.52, 6);
    await expect(page.getByText("Start with how loud it is")).toBeVisible();

    // Repeats keep raising toward the cap; the stage stays runnable.
    await page.getByRole("button", { name: "Can't hear this" }).click();
    n = await nState(page);
    expect(n.level).toBeCloseTo(.64, 6);
    await page.getByText("Start Sound", { exact: true }).click();
    await expect.poll(() => playingKey(page)).toBe("main");
    await expect(page.getByRole("button", { name: "The volume is about right" })).toBeEnabled();

    // The volume stage offers no Wider range; pitch passes offer both escapes.
    await expect(page.getByRole("button", { name: "Wider range" })).toHaveCount(0);
    await page.getByRole("button", { name: "The volume is about right" }).click();
    await expect(page.getByRole("button", { name: "Wider range" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Can't hear this" })).toBeVisible();
  });
});
