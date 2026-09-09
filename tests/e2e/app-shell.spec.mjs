/*
 * End-to-end tests for the app shell (REQ-001, REQ-020): navigation and
 * persistence, framed vs bare chrome, conditional Back, and audio hard stop.
 */
import { test, expect } from "@playwright/test";
import { startSessionFromSplash } from "./onboarding-helpers.mjs";

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
  await expect(page.locator('[data-screen-label="Shared · What to listen for"]')).toBeVisible();
  await page.getByRole("button", { name: "I'm ready to start" }).click();
  await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
}

test.describe("app shell", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("app shell persists setup only and reloads to Matching options with fresh flow state", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-screen-label="Launch"]')).toBeVisible();
    await completeSetup(page);

    // Options unlock only after setupSeen && eduSeen; open Option 1.
    await page.getByRole("button", { name: "Option 1" }).click();
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();
    await expect(page.locator("[data-progress]")).toBeVisible();

    // Whitelist only: no per-answer data, no identifiers.
    const stored = await page.evaluate((k) => JSON.parse(sessionStorage.getItem(k)), key);
    expect(Object.keys(stored).sort()).toEqual(["onboardingSeen", "earSeen", "setupSeen", "eduSeen", "optDone", "optOrder"].sort());
    expect(stored.onboardingSeen).toBe(true);
    expect(stored.earSeen).toBe(true);
    expect(stored.setupSeen).toBe(true);
    expect(stored.eduSeen).toBe(true);
    expect(stored.optOrder).toEqual([]);

    // Mid-flow reload lands on the hub and reseeds flow state from the factories.
    await page.reload();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    const n = await page.evaluate(() => window.__pnqAppState().n);
    expect(n.pitch).toBe(0.5);

    // Reopening the option reseeds again from freshN.
    await page.getByRole("button", { name: "Option 1" }).click();
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();

    // resetAll (session menu) clears storage and returns to Launch.
    await page.getByRole("button", { name: "Session menu" }).click();
    await page.getByRole("button", { name: "Reset the prototype" }).click();
    await expect(page.locator('[data-screen-label="Launch"]')).toBeVisible();
    expect(await page.evaluate((k) => sessionStorage.getItem(k), key)).toBeNull();
  });

  test("app shell shows Back only where the prototype does and it navigates as the prototype does", async ({ page }) => {
    await page.goto("/");
    const back = page.getByRole("button", { name: "Back" });
    await expect(back).toHaveCount(0);
    await startSessionFromSplash(page);
    await expect(page.locator('[data-screen-label="Setup · Ear"]')).toBeVisible();
    await expect(back).toHaveCount(0);
    await page.getByText("Both ears", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(back).toBeVisible();
    await back.click();
    await expect(page.locator('[data-screen-label="Setup · Ear"]')).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: /Headphones Plug in/ }).click();
    await page.getByLabel("Device volume").fill("100");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.locator('[data-screen-label="Shared · What to listen for"]')).toBeVisible();
    await back.click();
    await expect(page.locator('[data-screen-label="Setup · Headphones and volume"]')).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "I'm ready to start" }).click();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
  });

  test("app shell hard-stops audio on every screen and stage transition", async ({ page }) => {
    await page.goto("/");
    await completeSetup(page);
    await page.getByRole("button", { name: "What to listen for" }).click();
    await page.getByRole("button", { name: /A lower sound/ }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("edu-PITCH0");
    await page.getByRole("button", { name: "I'm ready to start" }).click();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    // After the transition nothing is audible until a new play action.
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
    expect(await page.evaluate(() => window.__pnqAppState().playKey)).toBe(null);

    // Stage transition inside a flow stops the main voice too.
    await page.getByRole("button", { name: "Option 1" }).click();
    await page.getByText("Start Sound", { exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("main");
    await page.getByRole("button", { name: "The volume is about right" }).click();
    await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
  });
});

test.describe("app shell chrome", () => {
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

    // Navigate, then cross the breakpoint: same markup, state preserved.
    await startSessionFromSplash(page);
    await page.setViewportSize({ width: 390, height: 700 });
    await expect(frame).toHaveAttribute("data-device-frame", "bare");
    await expect(page.getByText("9:41")).toHaveCount(0);
    await expect(page.locator('[data-screen-label="Setup · Ear"]')).toBeVisible();
    const bare = await frame.boundingBox();
    expect(Math.round(bare.width)).toBe(390);
    await page.setViewportSize({ width: 900, height: 900 });
    await expect(frame).toHaveAttribute("data-device-frame", "framed");
    await expect(page.locator('[data-screen-label="Setup · Ear"]')).toBeVisible();
  });
});
