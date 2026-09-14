import { test, expect } from "@playwright/test";
import { openSessionMenu } from "./onboarding-helpers.mjs";

const storageKey = "pnq-mtp-v1";

const playingKey = (page) => page.evaluate(() => window.__pnqAudioEngine?.playingKey() ?? null);

async function expectSilence(page) {
  await expect.poll(() => playingKey(page)).toBe(null);
  expect(await page.evaluate(() => window.__pnqAppState().playKey)).toBe(null);
}

async function chooseOption(page, number) {
  const option = page.getByRole("button", { name: `Option ${number}`, exact: true });
  const continueButton = page.getByRole("button", { name: "Continue", exact: true });
  await expect(page.locator("[data-matching-options-sheet]")).toBeVisible();
  await expect(continueButton).toBeDisabled();
  await option.press("Enter");
  await expect(option).toHaveAttribute("aria-pressed", "true");
  await expect(continueButton).toBeEnabled();
  await continueButton.click();
}

async function jumpToConfidence(page, optionNumber) {
  await openSessionMenu(page);
  await page.getByRole("button", { name: "Jump to a different section" }).click();
  const group = page.getByText(`OPTION ${optionNumber}`, { exact: true }).locator("..");
  await group.getByRole("button", { name: "Confidence", exact: true }).click();
  await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
}

async function finishCurrentOption(page, answer = "Very close") {
  await page.getByRole("button", { name: answer, exact: true }).click();
  await page.getByRole("button", { name: "Finish matching", exact: true }).click();
  await expect(page.locator('[data-screen-label="Shared · Match complete"]')).toBeVisible();
  await expectSilence(page);
}

test.describe("TASK-035 integrated first-session regression", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("one session covers setup, education, every option, A/B, switching, Help, menu, completion, and reset", async ({ page }) => {
    test.setTimeout(60000);

    await page.goto("/");
    await expect(page.locator('[data-screen-label="Launch"]')).toBeVisible();

    await page.getByRole("button", { name: "Get started" }).click();
    await expect(page.locator('[data-screen-label="Create account"]')).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Yes, that's me" }).click();
    await expect(page.locator('[data-screen-label="Dashboard"]')).toBeVisible();
    await page.getByRole("button", { name: "New Session" }).click();

    const ear = page.locator('[data-screen-label="Setup · Ear"]');
    await ear.getByRole("button", { name: "Both ears", exact: true }).click();
    await ear.getByRole("button", { name: "Play sample sound" }).click();
    await expect.poll(() => playingKey(page)).toBe("ear-sample");
    await ear.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator('[data-screen-label="Setup · Headphones and volume"]')).toBeVisible();
    await expectSilence(page);

    await page.getByRole("button", { name: /Headphones Plug in/ }).click();
    await page.getByLabel("Device volume").fill("100");
    await expect(page.getByText("Ready", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    const education = page.locator('[data-screen-label="Shared · What to listen for"]');
    await education.getByRole("button", { name: /A lower sound/ }).click();
    await expect.poll(() => playingKey(page)).toBe("edu-PITCH0");
    await page.getByRole("button", { name: "I'm ready to start" }).click();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    await expectSilence(page);

    // Option 1: matching audio survives Help and an in-option Back, then the
    // hidden session menu owns the explicit option exit and hard stop.
    await chooseOption(page, 1);
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();
    await page.getByRole("button", { name: "Start Sound", exact: true }).click();
    await expect.poll(() => playingKey(page)).toBe("main");

    const helpButton = page.locator("[data-session-navigation]").getByRole("button", { name: "Help", exact: true });
    await helpButton.click();
    await expect(page.getByRole("dialog", { name: "Help" })).toBeVisible();
    await expect.poll(() => playingKey(page)).toBe("main");
    await page.keyboard.press("Escape");
    await expect(helpButton).toBeFocused();

    await page.getByRole("button", { name: "This volume is close" }).click();
    await page.getByRole("button", { name: "Next: closer adjustments" }).click();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByText("Now find the pitch")).toBeVisible();
    await expect.poll(() => playingKey(page)).toBe("main");

    await openSessionMenu(page);
    await expect(page.getByRole("dialog", { name: "Session menu" })).toBeVisible();
    await expect(page.getByText("Sound stopped.")).toBeVisible();
    await expectSilence(page);
    await page.getByRole("button", { name: "Return to matching options" }).click();

    // Switching to Option 2 starts silent. Its normal directional path leads
    // to A/B, where choosing sound 1 carries that selected owner forward.
    await chooseOption(page, 2);
    await expect(page.locator('[data-screen-label="Shared · Listen and respond"]')).toBeVisible();
    await expectSilence(page);
    await page.getByRole("button", { name: "Start Sound", exact: true }).click();
    await page.getByRole("button", { name: "This volume is close" }).click();
    await page.getByRole("button", { name: "This pitch is close" }).click();
    await page.getByRole("button", { name: "This pitch is close" }).click();
    await expect(page.locator('[data-screen-label="Shared · Two-sound comparison"]')).toBeVisible();
    await expectSilence(page);

    await page.getByRole("button", { name: "Play sound 1" }).click();
    await expect.poll(() => playingKey(page)).toBe("prA");
    await page.getByRole("button", { name: "Play sound 2" }).click();
    await expect.poll(() => playingKey(page)).toBe("prB");
    await page.getByRole("button", { name: "This one" }).first().click();
    await expect.poll(() => playingKey(page)).toBe("prA");
    await expect(page.getByRole("button", { name: "Stop sound 1" })).toHaveAttribute("aria-pressed", "true");

    await jumpToConfidence(page, 2);
    await expectSilence(page);
    await finishCurrentOption(page, "Fairly close");
    await page.getByRole("button", { name: "Return to matching options" }).click();

    // Option 3 keeps its field owner through both zoom boundaries and into
    // Confidence, then completion stops it before the selector reopens.
    await chooseOption(page, 3);
    await expectSilence(page);
    await page.getByRole("button", { name: "Play the sound" }).click();
    await expect.poll(() => playingKey(page)).toBe("dfield");
    await page.getByRole("button", { name: "Look closely at this area" }).click();
    await page.getByRole("button", { name: "Look closely at this area" }).click();
    await page.getByRole("button", { name: "This sound is close" }).click();
    await expect(page.locator('[data-screen-label="Shared · Confidence"]')).toBeVisible();
    await expect.poll(() => playingKey(page)).toBe("dfield");
    await finishCurrentOption(page);
    await page.getByRole("button", { name: "Return to matching options" }).click();

    // Return to the previously exited option and finish the three-option
    // session. Completion order proves selection is participant-controlled.
    await chooseOption(page, 1);
    await jumpToConfidence(page, 1);
    await finishCurrentOption(page);
    expect(await page.evaluate(() => window.__pnqAppState().optOrder)).toEqual(["r", "d"]);
    await page.getByRole("button", { name: "Finish session" }).click();
    await expect(page.locator('[data-screen-label="Session complete"]')).toBeVisible();
    expect(await page.evaluate(() => window.__pnqAppState().optOrder)).toEqual(["r", "d", "n"]);

    const frame = page.locator("[data-device-frame]");
    const beforeReset = await frame.evaluate((node) => ({
      mode: node.getAttribute("data-device-frame"),
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height
    }));
    await openSessionMenu(page);
    await page.getByRole("button", { name: "Reset application" }).click();
    await expect(page.locator('[data-screen-label="Launch"]')).toBeVisible();
    await expectSilence(page);
    const afterReset = await frame.evaluate((node) => ({
      mode: node.getAttribute("data-device-frame"),
      width: node.getBoundingClientRect().width,
      height: node.getBoundingClientRect().height
    }));
    expect(afterReset).toEqual(beforeReset);
    expect(afterReset).toEqual({ mode: "bare", width: 390, height: 844 });
    expect(await page.evaluate((key) => sessionStorage.getItem(key), storageKey)).toBeNull();
  });
});
