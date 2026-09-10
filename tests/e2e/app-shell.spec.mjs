/*
 * End-to-end tests for the app shell (REQ-001, REQ-020): navigation and
 * persistence, framed vs bare chrome, conditional Back, and audio hard stop.
 */
import { test, expect } from "@playwright/test";
import { openSessionMenu, startMatchingOption, startSessionFromSplash } from "./onboarding-helpers.mjs";

const key = "pnq-mtp-v1";

async function completeSetup(page) {
  await startSessionFromSplash(page);
  await expect(page.locator('[data-screen-label="Setup · Ear"]')).toBeVisible();
  await page.getByText("Both ears", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator('[data-screen-label="Setup · Headphones and volume"]')).toBeVisible();
  await page.getByRole("button", { name: /Headphones Plug in/ }).click();
  await page.getByLabel("Device volume").fill("100");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
}

async function completeOptionFromConfidence(page, optionLabel) {
  await openSessionMenu(page);
  await page.getByRole("button", { name: "Jump to a different section" }).click();
  const group = page.getByText(optionLabel.toUpperCase(), { exact: true }).locator("..");
  await group.getByRole("button", { name: "Confidence", exact: true }).click();
  await page.getByRole("button", { name: "Very close", exact: true }).click();
  await page.getByRole("button", { name: "Finish matching" }).click();
  await expect(page.locator('[data-screen-label="Shared · Match complete"]')).toBeVisible();
  await page.getByRole("button", { name: /Return to matching options|Finish session/ }).click();
}

async function visitShellScreens(page, audit) {
  await page.goto("/");
  await audit("Launch");
  await page.getByRole("button", { name: "Get started" }).click();
  await audit("Create account · entry");
  await page.getByRole("button", { name: "Continue" }).click();
  await audit("Create account · confirmation");
  await page.getByRole("button", { name: "Yes, that's me" }).click();
  await audit("Dashboard");
  await page.getByRole("button", { name: "New Session" }).click();
  await audit("Setup · Ear");
  await page.getByRole("button", { name: "Both ears", exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await audit("Setup · Headphones and volume");
  await page.getByRole("button", { name: /Headphones/ }).click();
  await page.getByLabel("Device volume").fill("100");
  await page.getByRole("button", { name: "Continue" }).click();
  await audit("Matching options");
  await completeOptionFromConfidence(page, "Option 1");
  await completeOptionFromConfidence(page, "Option 2");
  await completeOptionFromConfidence(page, "Option 3");
  await audit("Session complete");
}

async function expectContainedShell(page, expectedMode) {
  const geometry = await page.locator("[data-device-frame]").evaluate((frame) => {
    const screen = frame.querySelector("[data-screen]");
    const frameRect = frame.getBoundingClientRect();
    const screenRect = screen.getBoundingClientRect();
    return {
      frameWidth: frameRect.width,
      frameHeight: frameRect.height,
      frameCenterX: frameRect.left + frameRect.width / 2,
      frameCenterY: frameRect.top + frameRect.height / 2,
      screenInsideFrame: screenRect.left >= frameRect.left - 1
        && screenRect.right <= frameRect.right + 1
        && screenRect.top >= frameRect.top - 1
        && screenRect.bottom <= frameRect.bottom + 1,
      screenHasNoHorizontalOverflow: screen.scrollWidth <= screen.clientWidth + 1,
      documentHasNoHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
      screen: screen.getAttribute("data-screen"),
      hasUsableScrollRegion: [...screen.querySelectorAll("*")].some((element) => {
        const overflow = getComputedStyle(element).overflowY;
        return (overflow === "auto" || overflow === "scroll") && element.clientHeight > 0;
      }),
      logicalWidth: parseFloat(getComputedStyle(frame).width),
      logicalHeight: parseFloat(getComputedStyle(frame).height)
    };
  });

  await expect(page.locator("[data-device-frame]")).toHaveAttribute("data-device-frame", expectedMode);
  expect(geometry.screenInsideFrame).toBe(true);
  expect(geometry.screenHasNoHorizontalOverflow).toBe(true);
  expect(geometry.documentHasNoHorizontalOverflow).toBe(true);
  if (geometry.screen !== "launch") expect(geometry.hasUsableScrollRegion).toBe(true);
  if (expectedMode === "bare") {
    const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
    expect(Math.round(geometry.frameWidth)).toBe(viewport.width);
    expect(Math.round(geometry.frameHeight)).toBe(viewport.height);
    await expect(page.locator('[data-safe-area="top"]')).toHaveCount(1);
    await expect(page.locator('[data-safe-area="bottom"]')).toHaveCount(1);
  } else {
    expect(geometry.logicalWidth).toBe(390);
    expect(geometry.logicalHeight).toBe(844);
    expect(geometry.frameCenterX).toBeCloseTo((await page.evaluate(() => innerWidth)) / 2, 0);
    expect(geometry.frameCenterY).toBeCloseTo((await page.evaluate(() => innerHeight)) / 2, 0);
    await expect(page.locator("[data-safe-area]")).toHaveCount(0);
  }
}

test.describe("app shell", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("app shell persists setup only and reloads to Matching options with fresh flow state", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-screen-label="Launch"]')).toBeVisible();
    await completeSetup(page);

    // Options unlock as soon as the headphone check completes; open Option 1.
    await startMatchingOption(page, 1);
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();
    await expect(page.locator("[data-progress]")).toBeVisible();

    // Whitelist only: no per-answer data, no identifiers.
    const stored = await page.evaluate((k) => JSON.parse(sessionStorage.getItem(k)), key);
    expect(Object.keys(stored).sort()).toEqual(["onboardingSeen", "earSeen", "setupSeen", "eduSeen", "optDone", "optOrder"].sort());
    expect(stored.onboardingSeen).toBe(true);
    expect(stored.earSeen).toBe(true);
    expect(stored.setupSeen).toBe(true);
    expect(stored.eduSeen).toBe(false);
    expect(stored.optOrder).toEqual([]);

    // Mid-flow reload lands on the hub and reseeds flow state from the factories.
    await page.reload();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    const n = await page.evaluate(() => window.__pnqAppState().n);
    expect(n.pitch).toBe(0.5);

    // Reopening the option reseeds again from freshN.
    await startMatchingOption(page, 1);
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();

    // resetAll (session menu) clears storage and returns to Launch.
    await openSessionMenu(page);
    await page.getByRole("button", { name: "Reset application" }).click();
    await expect(page.locator('[data-screen-label="Launch"]')).toBeVisible();
    expect(await page.evaluate((k) => sessionStorage.getItem(k), key)).toBeNull();
  });

  test("app shell shows Back only on the established screens and preserves its navigation", async ({ page }) => {
    await page.goto("/");
    const back = page.getByRole("button", { name: "Back" });
    await expect(back).toHaveCount(0);
    await startSessionFromSplash(page);
    await expect(page.locator('[data-screen-label="Setup · Ear"]')).toBeVisible();
    await expect(back).toBeVisible();
    await page.getByText("Both ears", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(back).toBeVisible();
    await back.click();
    await expect(page.locator('[data-screen-label="Setup · Ear"]')).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Headphones Plug in/ }).click();
    await page.getByLabel("Device volume").fill("100");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    await expect(back).toHaveCount(0);

    await openSessionMenu(page);
    await page.getByRole("button", { name: "Jump to a different section" }).click();
    await page.getByRole("button", { name: "Pitch and volume", exact: true }).click();
    await expect(page.locator('[data-screen-label="Shared · What to listen for"]')).toBeVisible();
    await back.click();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();

    await openSessionMenu(page);
    await page.getByRole("button", { name: "Jump to a different section" }).click();
    await page.getByRole("button", { name: "Headphone setup", exact: true }).click();
    await expect(page.locator('[data-screen-label="Setup · Headphones and volume"]')).toBeVisible();
    await back.click();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
  });

  test("app shell hard-stops audio on every screen and stage transition", async ({ page }) => {
    await page.goto("/");
    await completeSetup(page);
    await openSessionMenu(page);
    await page.getByRole("button", { name: "Jump to a different section" }).click();
    await page.getByRole("button", { name: "Pitch and volume", exact: true }).click();
    await page.getByRole("button", { name: /A lower sound/ }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("edu-PITCH0");
    await page.getByRole("button", { name: "I'm ready to start" }).click();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    // After the transition nothing is audible until a new play action.
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
    expect(await page.evaluate(() => window.__pnqAppState().playKey)).toBe(null);

    // Stage transition inside a flow stops the main voice too.
    await startMatchingOption(page, 1);
    await page.getByText("Start Sound", { exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("main");
    await page.getByRole("button", { name: "The volume is about right" }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
  });
});

test.describe("app shell chrome", () => {
  test("every shell screen is contained at 390 by 844 with safe-area chrome and no horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const visited = [];
    await visitShellScreens(page, async (label) => {
      visited.push(label);
      await expectContainedShell(page, "bare");
    });
    expect(visited).toEqual([
      "Launch", "Create account · entry", "Create account · confirmation",
      "Dashboard", "Setup · Ear", "Setup · Headphones and volume",
      "Matching options", "Session complete"
    ]);
  });

  test("every shell screen remains a centered logical 390 by 844 phone on desktop", async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1024, height: 900 });
    await visitShellScreens(page, async () => expectContainedShell(page, "framed"));
  });

  for (const scenario of [
    { width: 619, height: 900, mode: "bare" },
    { width: 620, height: 900, mode: "framed" }
  ]) {
    test(`every shell screen preserves ${scenario.mode} geometry at ${scenario.width}px`, async ({ page }) => {
      test.setTimeout(60000);
      await page.setViewportSize({ width: scenario.width, height: scenario.height });
      await visitShellScreens(page, async () => expectContainedShell(page, scenario.mode));
    });
  }

  test("app shell renders the framed device >=620px and bare fullscreen below, without state loss", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/");
    const frame = page.locator("[data-device-frame]");
    await expect(frame).toHaveAttribute("data-device-frame", "framed");
    await expect(page.getByText("9:41")).toBeVisible();
    const box = await frame.boundingBox();
    const scale = Math.round(Math.min(980 / 390, 756 / 844, 1) * 1000) / 1000;
    expect(Math.round(box.width)).toBe(Math.round(390 * scale));
    expect(Math.round(box.height)).toBe(Math.round(844 * scale));
    const canvasBg = await page.evaluate(() => getComputedStyle(document.querySelector("#root > div")).backgroundColor);
    expect(canvasBg).toBe("rgb(233, 231, 226)"); // the documented #e9e7e2 canvas

    // Navigate, then cross the exact breakpoint: the draft and screen survive.
    await page.getByRole("button", { name: "Get started" }).click();
    const input = page.getByRole("textbox", { name: "Prescription ID" });
    await input.fill("LOCAL-ONLY-DRAFT");
    await page.setViewportSize({ width: 619, height: 900 });
    await expect(frame).toHaveAttribute("data-device-frame", "bare");
    await expect(page.getByText("9:41")).toHaveCount(0);
    await expect(page.locator('[data-screen-label="Create account"]')).toBeVisible();
    await expect(input).toHaveValue("LOCAL-ONLY-DRAFT");
    const bare = await frame.boundingBox();
    expect(Math.round(bare.width)).toBe(619);
    await page.setViewportSize({ width: 620, height: 900 });
    await expect(frame).toHaveAttribute("data-device-frame", "framed");
    await expect(page.locator('[data-screen-label="Create account"]')).toBeVisible();
    await expect(input).toHaveValue("LOCAL-ONLY-DRAFT");
    expect(Math.round((await frame.boundingBox()).width)).toBe(390);
  });

  test("responsive web shell does not opt into installability or offline state", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
    expect(await page.locator('script[src*="service"],script[src*="worker"],script[src*="sw."]').count()).toBe(0);
    const registrations = await page.evaluate(async () => (
      "serviceWorker" in navigator ? (await navigator.serviceWorker.getRegistrations()).length : 0
    ));
    const cacheKeys = await page.evaluate(async () => ("caches" in window ? (await caches.keys()).length : 0));
    expect(registrations).toBe(0);
    expect(cacheKeys).toBe(0);
  });
});
