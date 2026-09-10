import { test, expect } from "@playwright/test";
import { openSessionMenu, startMatchingOption } from "./onboarding-helpers.mjs";

const storageKey = "pnq-mtp-v1";
const screen = (page, label) => page.locator(`[data-screen-label="${label}"]`);

async function restoreReadySession(page) {
  await page.addInitScript((key) => sessionStorage.setItem(key, JSON.stringify({
    onboardingSeen: true,
    earSeen: true,
    setupSeen: true,
    eduSeen: true,
    optDone: {},
    optOrder: []
  })), storageKey);
  await page.goto("/");
  await expect(page.locator("[data-matching-options-sheet]")).toBeVisible();
}

async function finishOptionTwoFromConfidence(page) {
  await startMatchingOption(page, 2);
  await openSessionMenu(page);
  await page.getByRole("button", { name: "Jump to a different section" }).click();
  const optionTwo = page.getByText("OPTION 2", { exact: true }).locator("..");
  await optionTwo.getByRole("button", { name: "Confidence", exact: true }).click();
  await page.getByRole("button", { name: "Fairly close", exact: true }).click();
  await page.getByRole("button", { name: "Finish matching" }).click();
}

test.describe("completed option return", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("keeps the summary and reopens the shared neutral sheet without repeating setup", async ({ page }) => {
    await restoreReadySession(page);
    await finishOptionTwoFromConfidence(page);

    const completion = screen(page, "Shared · Match complete");
    await expect(completion).toBeVisible();
    await expect(completion).toContainText("That’s this one done");
    await expect(completion).toContainText("Both ears");
    await expect(completion).toContainText("Fairly close");
    await expect(completion).toContainText("You chose to finish");
    await expect(completion).not.toContainText(/prototype|exploration ends/i);

    const returnButton = page.getByRole("button", { name: "Return to matching options", exact: true });
    await expect(returnButton).toBeVisible();
    await returnButton.click();

    const sheet = page.locator("[data-matching-options-sheet]");
    const completedSummary = page.locator('[data-matching-options-context="completion"]');
    await expect(screen(page, "Matching options")).toBeVisible();
    await expect(sheet).toBeVisible();
    await expect(completedSummary).toContainText("That’s this one done");
    await expect(completedSummary).toContainText("Both ears");
    await expect(completedSummary).toContainText("Fairly close");
    await expect(completedSummary).toContainText("You chose to finish");
    await expect(screen(page, "Setup · Ear")).toHaveCount(0);
    await expect(screen(page, "Setup · Headphones and volume")).toHaveCount(0);

    const options = [1, 2, 3].map((number) => page.getByRole("button", { name: `Option ${number}`, exact: true }));
    await expect(page.getByText("Done", { exact: true })).toHaveCount(0);
    for (const option of options) {
      await expect(option).toBeEnabled();
      await expect(option).toHaveAttribute("aria-pressed", "false");
      await expect(option).toHaveAttribute("data-option-state", "available");
    }

    // The just-completed option remains selectable. Merely selecting it keeps
    // the completed summary in place until Continue starts the fresh run.
    await options[1].click();
    await expect(options[1]).toHaveAttribute("aria-pressed", "true");
    await expect(completedSummary).toContainText("Fairly close");
    expect(await page.evaluate(() => window.__pnqAppState().matchingContextData?.title)).toBe("That’s this one done");
    await page.getByRole("button", { name: "Continue", exact: true }).click();

    await expect(screen(page, "Shared · Listen and respond")).toBeVisible();
    await expect(completedSummary).toHaveCount(0);
    const state = await page.evaluate(() => window.__pnqAppState());
    expect(state.concept).toBe("r");
    expect(state.stages.r).toBe("dir");
    expect(state.r.conf).toBeNull();
    expect(state.matchingContextData).toBeNull();
    expect(state.optDone).toEqual({ r: true });
    expect(state.optOrder).toEqual(["r"]);
  });
});
