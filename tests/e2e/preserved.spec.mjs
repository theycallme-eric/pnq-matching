import { test, expect } from "@playwright/test";

async function boot(page) {
  await page.addInitScript(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
    ear: "Both ears", hp: true, vol: 100, setupSeen: true, eduSeen: true, optDone: {}, optOrder: []
  })));
  await page.goto("/");
  await expect(page.locator('[data-screen="home"]')).toBeVisible();
}

async function jumpTo(page, cap, chip) {
  await page.getByRole("button", { name: "Session menu" }).click();
  await page.getByRole("button", { name: "Jump to a different section" }).click();
  const group = page.getByText(cap, { exact: true }).locator("..");
  await expect(group).toBeVisible();
  await group.getByRole("button", { name: chip, exact: true }).click();
}

const playing = (page) => page.evaluate(() => window.__pnqAudioEngine.playingKey());
const appState = (page, key) => page.evaluate((k) => window.__pnqAppState()[k], key);

test.describe("preserved flows (adaptive, longitudinal, education)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("none of the preserved flows appear on the participant hub", async ({ page }) => {
    await boot(page);
    const hub = page.locator('[data-screen="home"]');
    await expect(hub.getByRole("button", { name: "Option 1" })).toBeVisible();
    await expect(hub.getByText(/adaptive|longitudinal|exploration/i)).toHaveCount(0);
  });

  test("adaptive: candidate loop updates the estimate, cycles kinds, and stability suggests a final check", async ({ page }) => {
    await boot(page);
    await jumpTo(page, "ADAPTIVE REFINEMENT (PRESERVED)", "Broad start");
    await expect(page.locator('[data-screen-label="Shared · Listen and respond"]')).toBeVisible();
    await expect(page.getByText("MATCHING PITCH", { exact: true })).toBeVisible();

    const higher = page.getByRole("button", { name: "Mine is higher" });
    await expect(higher).toBeDisabled();
    await page.getByText("Start Sound", { exact: true }).click();
    await expect.poll(() => playing(page)).toBe("main");
    await expect(higher).toBeEnabled();

    await higher.click();
    let a = await appState(page, "a");
    expect(a.est).toBeCloseTo(.725, 6);
    expect(a.unc).toBeCloseTo(.425, 6);

    // "Not like mine" cycles the kind in fixed order and restarts wide.
    await page.getByRole("button", { name: "Not like mine at all" }).click();
    a = await appState(page, "a");
    expect(a.kind).toBe("hiss");
    expect(a.unc).toBeCloseTo(.5, 6);
    expect(a.est).toBeCloseTo(.5, 6);
    await expect(page.getByText("That helps. We'll try a different kind of sound.")).toBeVisible();

    // Two settled answers tighten into the loudness phase...
    const close = page.getByRole("button", { name: "This sounds like mine" });
    await close.click();
    await close.click();
    a = await appState(page, "a");
    expect(a.phase).toBe("loud");
    await expect(page.getByText("MATCHING LOUDNESS", { exact: true })).toBeVisible();

    // ...and two more settled answers raise the final-check suggestion.
    const loud = page.getByRole("button", { name: "This is as loud as mine" });
    await loud.click();
    await loud.click();
    await expect(page.getByText(/Nothing nearby has beaten this sound for a while/)).toBeVisible();
    await page.getByRole("button", { name: "Do the final check" }).click();

    await expect(page.locator('[data-screen-label="Shared · Two-sound comparison"]')).toBeVisible();
    await expect(page.getByText("One more check", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Play sound 1" }).click();
    await page.getByRole("button", { name: "Play sound 2" }).click();
    await page.getByRole("button", { name: "This one" }).first().click();

    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    await expect(page.getByText(/no longer getting closer to yours/)).toBeVisible();
    await page.getByText("Very close", { exact: true }).click();
    await page.getByRole("button", { name: "Finish matching" }).click();
    await expect(page.locator('[data-screen-label="Shared · Match complete"]')).toBeVisible();
    await expect(page.getByText("Nearby checks stopped improving", { exact: true })).toBeVisible();
  });

  test("adaptive: escapes raise the level and the patient-owned exit reaches Confidence", async ({ page }) => {
    await boot(page);
    await jumpTo(page, "ADAPTIVE REFINEMENT (PRESERVED)", "Broad start");
    await page.getByRole("button", { name: "Can't hear this" }).click();
    await expect(page.getByText("We made it a little easier to hear. Try again.")).toBeVisible();
    expect((await appState(page, "a")).level).toBeCloseTo(.57, 6);
    await expect(page.locator('[data-screen-label="Shared · Listen and respond"]')).toBeVisible();

    await page.getByRole("button", { name: "This is close enough" }).click();
    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    await expect(page.getByText(/You chose to stop. That is fine./)).toBeVisible();
  });

  test("longitudinal: welcome back, check-in, and the prior seeds the refine path", async ({ page }) => {
    await boot(page);
    await jumpTo(page, "LONGITUDINAL (PRESERVED)", "Welcome back");
    await expect(page.locator('[data-screen-label="Longitudinal · Welcome back"]')).toBeVisible();
    await expect(page.getByText("Previous match on file", { exact: true })).toBeVisible();
    await expect(page.getByText("6 days ago · Both ears", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Start today’s matching" }).click();

    await expect(page.locator('[data-screen-label="Longitudinal · Check-in"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await page.getByText("About the same", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Blind by default: no label reveals which sound is the prior.
    await expect(page.locator('[data-screen-label="Shared · Two-sound comparison"]')).toBeVisible();
    await expect(page.getByText("Which is more like today?", { exact: true })).toBeVisible();
    await expect(page.getByText("PREVIOUS MATCH", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Play sound 1" }).click();
    await page.getByRole("button", { name: "Play sound 2" }).click();
    await page.getByRole("button", { name: "This one" }).nth(1).click();

    await expect(page.locator('[data-screen-label="Longitudinal · Refine today"]')).toBeVisible();
    const l = await appState(page, "l");
    expect(l.picked).toBe("prior");
    expect(l.pitch).toBeCloseTo(.68, 6);
    expect(l.level).toBeCloseTo(.42, 6);
    await page.getByRole("button", { name: "This matches today" }).click();

    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    await expect(page.getByText("Judge today’s sound on its own, not by memory of last time.")).toBeVisible();
    await page.getByText("Fairly close", { exact: true }).click();
    await page.getByRole("button", { name: "Finish matching" }).click();
    await expect(page.locator('[data-screen-label="Shared · Match complete"]')).toBeVisible();
    await expect(page.getByText("Similar to your previous match", { exact: true })).toBeVisible();
  });

  test("longitudinal: labeled prior, and the fresh search runs a primary concept underneath", async ({ page }) => {
    await boot(page);
    await jumpTo(page, "LONGITUDINAL (PRESERVED)", "Labeled prior (transparent)");
    await expect(page.getByText("PREVIOUS MATCH", { exact: true })).toBeVisible();
    await expect(page.getByText(/One of these is your previous match/)).toBeVisible();
    await page.getByRole("button", { name: "Neither sounds right today" }).click();

    await expect(page.locator('[data-screen-label="Longitudinal · Fresh search"]')).toBeVisible();
    await expect(page.getByText(/Your hearing today comes first\. We'll search fresh\./)).toBeVisible();
    await page.getByRole("button", { name: "Comparison", exact: true }).click();
    await expect(page.locator('[data-screen-label="Shared · Listen and respond"]')).toBeVisible();
    expect(await page.evaluate(() => window.__pnqAppState().concept)).toBe("r");
  });

  test("longitudinal: 'different today' at check-in reopens a fresh search", async ({ page }) => {
    await boot(page);
    await jumpTo(page, "LONGITUDINAL (PRESERVED)", "Welcome back");
    await page.getByRole("button", { name: "Start today’s matching" }).click();
    await page.getByText("Different today", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator('[data-screen-label="Longitudinal · Fresh search"]')).toBeVisible();
    await expect(page.getByText("We’ll search fresh today.", { exact: true })).toBeVisible();
  });

  test("education: press-and-hold plays at the pointer position and releasing stops it", async ({ page }) => {
    await boot(page);
    await jumpTo(page, "EDUCATION · SOUND EXPLORATION (PRESERVED)", "First use");
    await expect(page.locator('[data-screen-label="Education · Sound exploration"]')).toBeVisible();
    await expect(page.getByText("Move around and listen", { exact: true })).toBeVisible();

    const field = page.locator("[data-field]");
    const box = await field.boundingBox();
    await page.mouse.move(box.x + box.width * .8, box.y + box.height * .2);
    await page.mouse.down();
    await expect.poll(() => playing(page)).toBe("field");
    let t = await appState(page, "t");
    expect(t.x).toBeGreaterThan(.7);
    expect(t.y).toBeLessThan(.3);
    await page.mouse.move(box.x + box.width * .2, box.y + box.height * .8);
    await expect.poll(async () => (await appState(page, "t")).x).toBeLessThan(.3);
    await page.mouse.up();
    await expect.poll(() => playing(page)).toBe(null);

    // Hearing it reveals the hedged vocabulary and the advance action.
    await expect(page.getByText(/Sounds around here may feel/)).toBeVisible();
    await page.getByRole("button", { name: "Explore this area closely" }).click();
    await expect(page.getByText("Explore this area", { exact: true })).toBeVisible();
  });

  test("education: behavior step, recap, no confidence or completion attached", async ({ page }) => {
    await boot(page);
    await jumpTo(page, "EDUCATION · SOUND EXPLORATION (PRESERVED)", "Behavior layer");
    await expect(page.getByText("How can a sound behave?", { exact: true })).toBeVisible();
    for (const label of ["Steady", "Pulsing", "Comes and goes", "Changing or fluttering", "Clicking or chirping"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await page.getByText("Pulsing", { exact: true }).click();
    await expect.poll(() => playing(page)).toBe("bh-Pulsing");
    await page.getByRole("button", { name: "I understand" }).click();

    await expect(page.getByText("That is the sound space", { exact: true })).toBeVisible();
    await expect(page.getByText(/You tried pulsing\./)).toBeVisible();
    await expect(page.getByText(/nothing you did here was saved as it/)).toBeVisible();
    // No confidence question, no match-complete: Done restarts the walkthrough.
    await expect(page.getByRole("button", { name: "Finish matching" })).toHaveCount(0);
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.getByText("Move around and listen", { exact: true })).toBeVisible();
    expect((await appState(page, "t")).heard).toBe(false);
  });

  test("education: the field escape reassures without error framing", async ({ page }) => {
    await boot(page);
    await jumpTo(page, "EDUCATION · SOUND EXPLORATION (PRESERVED)", "Broad field");
    await page.getByRole("button", { name: "I can't hear this sound" }).click();
    await expect(page.getByText(/That is okay, and worth telling us/)).toBeVisible();
    await expect(page.locator('[data-screen-label="Education · Sound exploration"]')).toBeVisible();
  });
});
