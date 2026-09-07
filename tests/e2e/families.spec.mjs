import { test, expect } from "@playwright/test";

async function boot(page) {
  await page.addInitScript(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
    ear: "Both ears", hp: true, vol: 100, setupSeen: true, eduSeen: true, optDone: {}, optOrder: []
  })));
  await page.goto("/");
  await expect(page.locator('[data-screen="home"]')).toBeVisible();
}

async function jumpToFamilies(page, chip) {
  await page.getByRole("button", { name: "Session menu" }).click();
  await page.getByRole("button", { name: "Jump to a different section" }).click();
  const group = page.getByText("SOUND-FAMILY GUIDED (PRESERVED)", { exact: true }).locator("..");
  await expect(group).toBeVisible();
  await group.getByRole("button", { name: chip, exact: true }).click();
}

const playing = (page) => page.evaluate(() => window.__pnqAudioEngine.playingKey());
const appF = (page) => page.evaluate(() => window.__pnqAppState().f);

test.describe("families (preserved V5 sound-family guided flow)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("reachable only through the moderator menu, never the participant hub", async ({ page }) => {
    await boot(page);
    const hub = page.locator('[data-screen="home"]');
    await expect(hub.getByRole("button", { name: "Option 1" })).toBeVisible();
    await expect(hub.getByRole("button", { name: "Option 2" })).toBeVisible();
    await expect(hub.getByRole("button", { name: "Option 3" })).toBeVisible();
    await expect(hub.getByText(/famil/i)).toHaveCount(0);

    await jumpToFamilies(page, "Prepare");
    await expect(page.locator('[data-screen-label="Families · Prepare"]')).toBeVisible();
    await expect(page.getByText("What does it sound like?")).toBeVisible();
    await expect(page.getByText("BOTH EARS", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Start listening" }).click();
    await expect(page.locator('[data-screen-label="Families · Sound families"]')).toBeVisible();
  });

  test("family rows keep preview and selection independent", async ({ page }) => {
    await boot(page);
    await jumpToFamilies(page, "Families open");
    await expect(page.locator('[data-screen-label="Families · Sound families"]')).toBeVisible();

    for (const name of ["Hissing or rushing", "Buzzing or humming", "A tone", "Clicking or chirping", "Hard to describe"]) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }
    // Four playable examples: "Hard to describe" has none in V5.
    await expect(page.getByRole("button", { name: /^Play .+ example$/ })).toHaveCount(4);

    const cont = page.getByRole("button", { name: "Continue" });
    await expect(cont).toBeDisabled();

    // Previewing the first family (hiss) plays it but selects nothing.
    const hissPreview = page.getByRole("button", { name: "Play Hissing or rushing example", exact: true });
    await expect(hissPreview).toHaveAttribute("aria-pressed", "false");
    await hissPreview.click();
    await expect(page.getByRole("button", { name: "Stop Hissing or rushing example", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => playing(page)).toBe("fam-hiss");
    expect((await appF(page)).fam).toBe(null);
    await expect(cont).toBeDisabled();

    const hissChoice = page.getByRole("button", { name: "Select Hissing or rushing", exact: true });
    await hissChoice.press("Enter");
    await expect(hissChoice).toHaveAttribute("aria-pressed", "true");
    expect((await appF(page)).fam).toBe("hiss");
    await expect(cont).toBeEnabled();

    // The escape link leaves the stage alone and shows the V5 note.
    await page.getByRole("button", { name: "I can't hear these examples" }).click();
    await expect(page.getByText("We made the examples a little easier to hear. Check your headphones are snug.", { exact: false })).toBeVisible();
    await expect(page.locator('[data-screen-label="Families · Sound families"]')).toBeVisible();
  });

  test("full run: family, character, tuning, second sound, shared completion", async ({ page }) => {
    await boot(page);
    await jumpToFamilies(page, "Families open");
    await page.getByRole("button", { name: "Select Hissing or rushing", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.locator('[data-screen-label="Families · Character"]')).toBeVisible();
    await expect(page.getByText("Which is closest?", { exact: true })).toBeVisible();
    await expect(page.getByText("All of these are hiss sounds with a different character.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Play .+ example$/ })).toHaveCount(6);
    await expect(page.getByRole("button", { name: "Continue" })).toBeDisabled();
    await page.getByRole("button", { name: "Select Like radio static", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.locator('[data-screen-label="Families · Pitch and loudness"]')).toBeVisible();
    await expect(page.getByText("YOUR SOUND", { exact: true })).toBeVisible();
    await expect(page.getByText("Bring it closer", { exact: true })).toBeVisible();
    // The escape bumps the working loudness by .12 without leaving the stage.
    await page.getByRole("button", { name: "I can't hear this sound" }).click();
    expect((await appF(page)).work.spec.level).toBeCloseTo(0.54, 5);
    await expect(page.getByText("We made it a little easier to hear.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "This matches" }).click();

    await expect(page.locator('[data-screen-label="Families · More sounds"]')).toBeVisible();
    await expect(page.getByText("Sound 1: hissing or rushing", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Just this one sound" })).toBeVisible();
    await page.getByRole("button", { name: "Add another sound" }).click();

    await expect(page.locator('[data-screen-label="Families · Sound families"]')).toBeVisible();
    await expect(page.getByText("Matching sound 2 now. Same steps, and sound 1 is saved.")).toBeVisible();
    await page.getByRole("button", { name: "Select A tone", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("People often say “ringing” for tinnitus in general", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Select Like a whistle", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("SOUND 2", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "This matches" }).click();

    await expect(page.getByText("Sound 1: hissing or rushing", { exact: true })).toBeVisible();
    await expect(page.getByText("Sound 2: a tone", { exact: true })).toBeVisible();
    // Both sounds layer through the one shared engine under a single key.
    await page.getByText("Play them together", { exact: true }).click();
    await expect.poll(() => playing(page)).toBe("together");
    await page.getByRole("button", { name: "Done, this matches" }).click();

    // Leaving the stage hard-stops the layered playback.
    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    await expect.poll(() => playing(page)).toBe(null);
    await page.getByText("Very close", { exact: true }).click();
    await page.getByRole("button", { name: "Finish matching" }).click();

    await expect(page.locator('[data-screen-label="Shared · Match complete"]')).toBeVisible();
    await expect(page.getByText("SOUND 1", { exact: true })).toBeVisible();
    await expect(page.getByText("SOUND 2", { exact: true })).toBeVisible();
    await expect(page.getByText("Both ears", { exact: true })).toBeVisible();
    await expect(page.getByText("Very close", { exact: true })).toBeVisible();
  });

  test("escape paths: none fit and the hard-to-describe listening path", async ({ page }) => {
    await boot(page);
    await jumpToFamilies(page, "Families open");
    await page.getByRole("button", { name: "None of these fit" }).click();

    await expect(page.locator('[data-screen-label="Families · Character"]')).toBeVisible();
    await expect(page.getByText("Just listen", { exact: true })).toBeVisible();
    await expect(page.getByText("Words can get in the way.", { exact: false })).toBeVisible();
    for (const label of ["Sound 1", "Sound 2", "Sound 3", "Sound 4", "Sound 5", "Sound 6"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }

    await page.getByRole("button", { name: "Still not close" }).click();
    await expect(page.locator('[data-screen-label="Families · Pitch and loudness"]')).toBeVisible();
    await expect(page.getByText("We’ll keep the search wide and shape the sound directly.", { exact: false })).toBeVisible();
    const f = await appF(page);
    expect(f.work).toEqual({ fam: "hard", charIdx: -1, spec: { kind: "hiss", pitch: .5, level: .4, bright: .3, behavior: "steady" } });

    // A non-hard family reroutes back to the family list instead.
    await jumpToFamilies(page, "Families open");
    await page.getByRole("button", { name: "Select Buzzing or humming", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "None of these are close" }).click();
    await expect(page.locator('[data-screen-label="Families · Sound families"]')).toBeVisible();
    await expect(page.getByText("Try another kind, or choose “Hard to describe.” Both are normal.")).toBeVisible();
  });

  test("second sound can be removed, keeping sound 1", async ({ page }) => {
    await boot(page);
    await jumpToFamilies(page, "Two sounds");
    await expect(page.locator('[data-screen-label="Families · More sounds"]')).toBeVisible();
    await expect(page.getByText("Sound 2: a tone", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Remove sound 2" }).click();
    await expect(page.getByText("Sound 2: a tone", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Sound 1: hissing or rushing", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add another sound" })).toBeVisible();
    const f = await appF(page);
    expect(f.s2).toBe(null);
    expect(f.editing).toBe(1);
  });
});
