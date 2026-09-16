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
    expect(r.originalEndpoint).toBeCloseTo(.7, 6);
    expect(r.winnerPitch).toBeCloseTo(.7, 6);
    await expect(page.locator('[data-sound-position="1"]')).toHaveAttribute("data-sound-pitch", String(r.originalEndpoint));

    await page.getByRole("button", { name: "Play sound 1" }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("prA");
    const endpointRequest = await page.evaluate(() => window.__pnqLastAudioRequest);
    expect(endpointRequest.key).toBe("prA");
    expect(endpointRequest.specs[0].pitch).toBeCloseTo(.7, 6);
  });

  test("both winner branches retain the exact choice as Sound 1 while Sound 2 narrows", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "A/B comparisons");

    const pairPitches = () => page.locator("[data-sound-position]").evaluateAll((cards) =>
      cards.map((card) => Number(card.getAttribute("data-sound-pitch")))
    );
    const auditionPair = async () => {
      await page.getByRole("button", { name: "Play sound 1" }).click();
      await page.getByRole("button", { name: "Play sound 2" }).click();
    };
    const picks = page.getByRole("button", { name: "This one" });

    const first = await pairPitches();
    await auditionPair();
    await picks.first().click();
    const second = await pairPitches();
    expect(second[0]).toBeCloseTo(first[0], 12);
    expect(second[1]).not.toBeCloseTo(first[1], 12);
    expect(Math.abs(second[1] - second[0])).toBeLessThan(Math.abs(first[1] - first[0]));
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("prA");
    expect(await page.evaluate(() => window.__pnqLastAudioRequest.specs[0].pitch)).toBeCloseTo(second[0], 12);
    await expect(page.getByRole("button", { name: "Stop sound 1" })).toHaveAttribute("aria-pressed", "true");
    await expect(picks.first()).toBeDisabled();
    await expect(picks.nth(1)).toBeDisabled();

    await page.getByRole("button", { name: "Stop sound 1" }).click();
    await auditionPair();
    await picks.first().click();
    const third = await pairPitches();
    expect(third[0]).toBeCloseTo(second[0], 12);
    expect(Math.abs(third[1] - third[0])).toBeLessThan(Math.abs(second[1] - second[0]));

    // Exercise the other branch from a fresh ordinary pair so the preceding
    // consecutive Sound 1 wins do not reach the existing spread-floor exit.
    await jumpTo(page, "A/B comparisons");
    const challengerRound = await pairPitches();
    await auditionPair();
    const selectedChallenger = challengerRound[1];
    await picks.nth(1).click();
    const next = await pairPitches();
    expect(next[0]).toBeCloseTo(selectedChallenger, 12);
    expect(next[1]).not.toBeCloseTo(challengerRound[0], 12);
    expect(next[1]).not.toBeCloseTo(challengerRound[1], 12);
    expect(next[1]).toBeGreaterThanOrEqual(0);
    expect(next[1]).toBeLessThanOrEqual(1);
    expect(Math.abs(next[1] - next[0])).toBeLessThan(Math.abs(challengerRound[1] - challengerRound[0]));
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("prA");
    const winnerRequest = await page.evaluate(() => window.__pnqLastAudioRequest);
    expect(winnerRequest.key).toBe("prA");
    expect(winnerRequest.specs[0].pitch).toBeCloseTo(next[0], 12);
    await expect(page.getByRole("button", { name: "Stop sound 1" })).toHaveAttribute("aria-pressed", "true");
  });

  test("a differing winner gets one exact endpoint validation and either choice finishes", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "A/B comparisons");

    const pairPitches = () => page.locator("[data-sound-position]").evaluateAll((cards) =>
      cards.map((card) => Number(card.getAttribute("data-sound-pitch")))
    );
    const auditionPair = async () => {
      await page.getByRole("button", { name: "Play sound 1" }).click();
      await page.getByRole("button", { name: "Play sound 2" }).click();
    };
    const picks = page.getByRole("button", { name: "This one" });
    const originalEndpoint = (await rState(page)).originalEndpoint;

    await auditionPair();
    const selectedChallenger = (await pairPitches())[1];
    await picks.nth(1).click();
    for (let choice = 2; choice <= 3; choice += 1) {
      await page.getByRole("button", { name: "Stop sound 1" }).click();
      await auditionPair();
      await picks.first().click();
    }

    await expect(page.locator('[data-screen-label="Shared · Two-sound comparison"]')).toBeVisible();
    let r = await rState(page);
    expect(r.ordinaryChoices).toBe(3);
    expect(r.validation).toBe(true);
    expect(r.winnerPitch).toBeCloseTo(selectedChallenger, 12);
    expect(await pairPitches()).toEqual([selectedChallenger, originalEndpoint]);
    await expect(page.getByRole("button", { name: "Stop sound 1" })).toHaveAttribute("aria-pressed", "true");
    const carriedWinner = await page.evaluate(() => window.__pnqLastAudioRequest);
    expect(carriedWinner.key).toBe("prA");
    expect(carriedWinner.specs[0].pitch).toBeCloseTo(selectedChallenger, 12);
    await expect(page.getByRole("button", { name: "Neither is close" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "They sound the same" })).toHaveCount(0);

    await page.getByRole("button", { name: "Stop sound 1" }).click();
    await auditionPair();
    await expect.poll(() => page.evaluate(() => window.__pnqLastAudioRequest.specs[0].pitch)).toBeCloseTo(originalEndpoint, 12);
    await picks.nth(1).click();

    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    await expect(page.locator("[data-sound-position]")).toHaveCount(0);
    r = await rState(page);
    expect(r.center).toBeCloseTo(originalEndpoint, 12);
    expect(r.winnerPitch).toBeCloseTo(originalEndpoint, 12);
    expect(r.ordinaryChoices).toBe(3);
    expect(r.validation).toBe(false);
    expect(r.validationComplete).toBe(true);
    expect(r.challengerPitch).toBe(null);
    expect(await page.evaluate(() => window.__pnqLastAudioRequest.specs[0].pitch)).toBeCloseTo(originalEndpoint, 12);
  });

  test("an endpoint winner skips duplicate validation after exactly three ordinary choices", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "A/B comparisons");

    const auditionPair = async () => {
      await page.getByRole("button", { name: "Play sound 1" }).click();
      await page.getByRole("button", { name: "Play sound 2" }).click();
    };
    const picks = page.getByRole("button", { name: "This one" });
    const originalEndpoint = (await rState(page)).originalEndpoint;

    for (let choice = 1; choice <= 3; choice += 1) {
      if (choice > 1) await page.getByRole("button", { name: "Stop sound 1" }).click();
      await auditionPair();
      await picks.first().click();
      if (choice < 3) {
        await expect(page.locator('[data-screen-label="Shared · Two-sound comparison"]')).toBeVisible();
        expect((await rState(page)).ordinaryChoices).toBe(choice);
      }
    }

    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    await expect(page.locator("[data-sound-position]")).toHaveCount(0);
    const r = await rState(page);
    expect(r.center).toBeCloseTo(originalEndpoint, 12);
    expect(r.winnerPitch).toBeCloseTo(originalEndpoint, 12);
    expect(r.ordinaryChoices).toBe(3);
    expect(r.validation).toBe(false);
    expect(r.validationComplete).toBe(true);
    expect(r.stop).toBe("endpoint-match");
    expect(r.challengerPitch).toBe(null);
  });

  test("A/B guidance and every choice follow the current pair's two auditions", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "A/B comparisons");
    await expect(page.locator('[data-screen-label="Shared · Two-sound comparison"]')).toBeVisible();

    const picks = page.getByRole("button", { name: "This one" });
    const outcomes = page.getByRole("button", { name: /Neither is close|They sound the same/ });
    const applicableChoices = page.getByRole("button", { name: /This one|Neither is close|They sound the same/ });
    await expect(picks).toHaveCount(2);
    await expect(outcomes).toHaveCount(2);
    await expect(applicableChoices).toHaveCount(4);
    for (const choice of await applicableChoices.all()) await expect(choice).toBeDisabled();
    await expect(page.getByText("Play both sounds before choosing.")).toBeVisible();

    const sound1 = page.getByRole("button", { name: "Play sound 1" });
    await expect(sound1).toHaveAttribute("aria-pressed", "false");
    await sound1.click();
    await expect(page.getByRole("button", { name: "Stop sound 1" })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("prA");
    for (const choice of await applicableChoices.all()) await expect(choice).toBeDisabled();
    await expect(page.getByText("Play Sound 2 before choosing.")).toBeVisible();
    await expect(page.getByText("Play both sounds before choosing.")).toHaveCount(0);

    await page.getByRole("button", { name: "Play sound 2" }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("prB");
    for (const choice of await applicableChoices.all()) await expect(choice).toBeEnabled();
    await expect(page.locator("[data-comparison-guidance]")).toHaveCount(0);

    await picks.first().click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("prA");
    const r = await rState(page);
    expect(r.round).toBe(3);
    expect(r.spread).toBeCloseTo(.156, 6);
    expect(r.center).toBeCloseTo(.58, 6);
    expect(r.winnerPitch).toBeCloseTo(.58, 6);
    for (const choice of await applicableChoices.all()) await expect(choice).toBeDisabled();
    await expect(page.getByText("Play both sounds before choosing.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Stop sound 1" })).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => {
      const s = window.__pnqAppState();
      return [s.prKey, s.prHeardA, s.prHeardB];
    })).toEqual([null, false, false]);

    // The carried selection is not a new-pair audition. Stop it, then audition
    // Sound 2 first so the exact remaining-sound guidance is covered too.
    await page.getByRole("button", { name: "Stop sound 1" }).click();
    await page.getByRole("button", { name: "Play sound 2" }).click();
    for (const choice of await applicableChoices.all()) await expect(choice).toBeDisabled();
    await expect(page.getByText("Play Sound 1 before choosing.")).toBeVisible();
    await page.getByRole("button", { name: "Play sound 1" }).click();
    for (const choice of await applicableChoices.all()) await expect(choice).toBeEnabled();
    await expect(page.locator("[data-comparison-guidance]")).toHaveCount(0);
  });

  test("a narrow spread still requires three ordinary choices before Confidence", async ({ page }) => {
    await seed(page);
    await jumpTo(page, "A/B · near the floor");
    for (let choice = 1; choice <= 3; choice += 1) {
      if (choice > 1) await page.getByRole("button", { name: "Stop sound 1" }).click();
      await page.getByRole("button", { name: "Play sound 1" }).click();
      await page.getByRole("button", { name: "Play sound 2" }).click();
      await page.getByRole("button", { name: "This one" }).first().click();
      if (choice < 3) {
        await expect(page.locator('[data-screen-label="Shared · Two-sound comparison"]')).toBeVisible();
        expect((await rState(page)).ordinaryChoices).toBe(choice);
      }
    }
    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    await expect(page.getByText("Stop Sound", { exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("prA");
    const r = await rState(page);
    expect(r.stop).toBe("endpoint-match");
    expect(r.ordinaryChoices).toBe(3);
    expect(r.spread).toBeCloseTo(.075 * .6 * .6 * .6, 6);
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
    const applicableChoices = page.getByRole("button", { name: /This one|Neither is close|They sound the same|Finish from my best match/ });
    await expect(applicableChoices).toHaveCount(5);
    for (const choice of await applicableChoices.all()) await expect(choice).toBeDisabled();
    await expect(page.getByText("Play both sounds before choosing.")).toBeVisible();
    await page.getByRole("button", { name: "Play sound 1" }).click();
    for (const choice of await applicableChoices.all()) await expect(choice).toBeDisabled();
    await expect(page.getByText("Play Sound 2 before choosing.")).toBeVisible();
    await page.getByRole("button", { name: "Play sound 2" }).click();
    for (const choice of await applicableChoices.all()) await expect(choice).toBeEnabled();
    await expect(page.locator("[data-comparison-guidance]")).toHaveCount(0);
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
