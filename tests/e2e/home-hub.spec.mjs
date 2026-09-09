/*
 * End-to-end tests for the home hub (REQ-005, REQ-006, REQ-013): arrival only
 * after the shared session gates, exactly three neutral participant-controlled
 * options, non-color-only Done state, fresh reopening, completion-order
 * tracking, and ear re-routing without leaving the hub.
 */
import { test, expect } from "@playwright/test";
import { startSessionFromSplash } from "./onboarding-helpers.mjs";
import { auditParticipantStrings } from "../../src/participant-copy.js";

const hub = (page) => page.locator('[data-screen-label="Matching options"]');
const selector = (page) => page.locator("[data-option-selector]");
const option = (page, n) => selector(page).locator(`[data-option-id="${n}"]`);

async function reachReadyHub(page) {
  await page.goto("/");
  await startSessionFromSplash(page);
  await page.getByText("Both ears", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: /Headphones Plug in/ }).click();
  await page.getByLabel("Device volume").fill("100");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator('[data-screen-label="Shared · What to listen for"]')).toBeVisible();
  await page.getByRole("button", { name: "I'm ready to start" }).click();
  await expect(hub(page)).toBeVisible();
}

// Walks a flow to Match complete and returns to the hub. Each stage's
// judgment is heard-gated (REQ-018), so play the sound before advancing.
async function completeOption(page, n) {
  await option(page, n).click();
  await expect(hub(page)).toHaveCount(0);
  if (n === 2) {
    // Option 2's real stages: settle both directional phases, then stop the
    // A/B loop by saying the two sound the same.
    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("button", { name: "The volume is set, move on" }).click();
    await page.getByRole("button", { name: "The pitch is set, finish up" }).click();
    await page.getByRole("button", { name: "The pitch is set, finish up" }).click();
    await page.getByRole("button", { name: "They sound the same" }).click();
  } else if (n === 1) {
    // Option 1's real stages: sign off the volume, then the three pitch
    // passes. Each stage hard-stops and must be played before judgment.
    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("button", { name: "The volume is about right" }).click();
    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("button", { name: "Next: closer adjustments" }).click();
    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("button", { name: "Next: fine adjustments" }).click();
    await page.getByText("Start Sound", { exact: true }).click();
    await page.getByRole("button", { name: "This matches what I hear" }).click();
  } else if (n === 3) {
    // Option 3 keeps the same field screen while narrowing twice. Its final
    // participant judgment has its own label rather than a generic Continue.
    for (let level = 0; level < 3; level++) {
      await page.getByRole("button", { name: "Play the sound" }).click();
      await page.getByRole("button", { name: level < 2 ? "Look closely at this area" : "This sounds like my tinnitus" }).click();
    }
  }
  await page.getByText("Fairly close").click();
  await page.getByRole("button", { name: "Finish matching" }).click();
  await expect(page.locator('[data-screen-label="Shared · Match complete"]')).toBeVisible();
  await page.getByRole("button", { name: "Return to matching options" }).click();
  await expect(hub(page)).toBeVisible();
}

test.describe("home hub", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("home hub appears only after setup and education, with all option rows enabled", async ({ page }) => {
    await page.goto("/");
    await startSessionFromSplash(page);
    await expect(hub(page)).toHaveCount(0);
    await expect(option(page, 1)).toHaveCount(0);
    await page.getByText("Both ears", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(hub(page)).toHaveCount(0);
    await page.getByRole("button", { name: /Headphones Plug in/ }).click();
    await page.getByLabel("Device volume").fill("100");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(hub(page)).toHaveCount(0);
    await expect(page.locator('[data-screen-label="Shared · What to listen for"]')).toBeVisible();
    await page.getByRole("button", { name: "I'm ready to start" }).click();
    await expect(hub(page)).toBeVisible();
    await expect(selector(page).getByRole("button")).toHaveCount(3);
    expect(await selector(page).locator("[data-option-label]").allTextContents()).toEqual(["Option 1", "Option 2", "Option 3"]);
    for (const n of [1, 2, 3]) {
      const row = option(page, n);
      await expect(row).not.toHaveAttribute("aria-disabled", /.*/);
      await expect(row).toHaveCSS("cursor", "pointer");
      await expect(row).not.toHaveCSS("box-shadow", "none");
    }

    // An enabled row opens its flow.
    await option(page, 1).click();
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();
  });

  test("home hub shows only neutral participant-facing labels", async ({ page }) => {
    await reachReadyHub(page);
    await expect(option(page, 1)).toBeVisible();
    await expect(option(page, 2)).toBeVisible();
    await expect(option(page, 3)).toBeVisible();
    // No internal concept names or research language anywhere on the hub.
    const text = await page.locator("[data-device-frame]").innerText();
    expect(text).not.toMatch(/Narrowing|Comparison|Adaptive|Families|2D|Field|Longitudinal|concept|hypothes|method|approach|stage|winner|fallback|retry/i);
    expect(auditParticipantStrings(text.split(/\n+/))).toEqual([]);
  });

  test("options complete out of order, return to the same selector, and reopen fresh with unique Done state", async ({ page }) => {
    await reachReadyHub(page);

    // Each completed session gate has its gray check pill on selector arrival.
    await expect(page.getByRole("button", { name: "Headphones and volume" }).getByText("Done")).toBeVisible();
    const eduRow = page.getByRole("button", { name: "What to listen for" });
    await expect(eduRow.getByText("Done")).toBeVisible();
    await expect(eduRow.locator("svg")).toHaveCount(2); // check pill + chevron

    // Complete Option 3 first. The app returns directly to this same selector,
    // keeps every option selectable, and does not repeat any session gate.
    await completeOption(page, 3); // d: field -> zoom -> conf
    await expect(option(page, 3).getByText("Done")).toBeVisible();
    await expect(option(page, 3).locator("[data-option-status] svg")).toHaveCount(1);
    await expect(option(page, 1).getByText("Done")).toHaveCount(0);
    for (const n of [1, 2, 3]) await expect(option(page, n)).not.toHaveAttribute("aria-disabled", /.*/);
    let st = await page.evaluate(() => window.__pnqAppState());
    expect([st.earSeen, st.setupSeen, st.eduSeen]).toEqual([true, true, true]);
    expect(st.optOrder).toEqual(["d"]);

    // A completed option remains selectable. Reopening it uses freshD and
    // retains the session-level Done marker while no other option launches.
    await option(page, 3).click();
    st = await page.evaluate(() => window.__pnqAppState());
    expect(st.concept).toBe("d");
    expect(st.stages.d).toBe("field");
    expect(st.d).toEqual({ x: .5, y: .5, cx: .5, cy: .5, level: 0, heard: false, zoomed: false, note: "", conf: null });
    expect(st.optDone).toEqual({ d: true });
    await page.getByRole("button", { name: "Back" }).click();
    await expect(hub(page)).toBeVisible();

    // Complete Option 1 second, then open the remaining Option 2. Each opens
    // at its V5 initial state and completion order reflects participant action.
    await completeOption(page, 1); // n: vol -> p1 -> p2 -> p3 -> conf
    await expect(option(page, 1).getByText("Done")).toBeVisible();
    await option(page, 1).click();
    st = await page.evaluate(() => window.__pnqAppState());
    expect(st.n).toEqual({ pitch: .5, level: .4, center: .5, lo: .34, hi: .66, extra: 0, widened: 0, note: "", conf: null, closeEnough: false });
    expect(st.optOrder).toEqual(["d", "n"]);
    await page.getByRole("button", { name: "Back" }).click();
    await option(page, 2).click();
    st = await page.evaluate(() => window.__pnqAppState());
    expect(st.concept).toBe("r");
    expect(st.stages.r).toBe("dir");
    expect(st.r.phase).toBe("vol");
    expect(st.r.spread).toBe(.28);
    expect(st.optOrder).toEqual(["d", "n"]);
    expect(Object.keys(st.optDone).sort()).toEqual(["d", "n"]);
  });

  test("home hub ear control re-routes the engine without leaving the hub", async ({ page }) => {
    // Record every StereoPanner the engine builds so routing is observable.
    await page.addInitScript(() => {
      const orig = AudioContext.prototype.createStereoPanner;
      window.__panners = [];
      AudioContext.prototype.createStereoPanner = function (...args) {
        const p = orig.apply(this, args);
        window.__panners.push(p);
        return p;
      };
    });
    await reachReadyHub(page);

    const earControl = page.getByRole("group", { name: "Sound plays in" });
    await expect(earControl.getByRole("button", { name: "Both", exact: true })).toHaveAttribute("aria-pressed", "true");
    const left = earControl.getByRole("button", { name: "Left", exact: true });
    await expect(left).toHaveAttribute("aria-pressed", "false");
    await left.press("Enter");
    await expect(left).toHaveAttribute("aria-pressed", "true");
    await expect(earControl.getByRole("button", { name: "Both", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(hub(page)).toBeVisible(); // no navigation
    expect(await page.evaluate(() => window.__pnqAppState().ear)).toBe("Left ear");

    // First playback builds the graph already routed to the chosen ear.
    expect(await page.evaluate(() => window.__pnqAudioEngine.play("probe", [{ kind: "tone", pitch: 0.5, level: 0.3 }]))).toBe(true);
    expect(await page.evaluate(() => window.__pnqAudioEngine.earIsRouted())).toBe(true);
    expect(await page.evaluate(() => window.__panners[0].pan.value)).toBe(-1);

    // Switching ears re-routes the engine, still without leaving the hub.
    await earControl.getByRole("button", { name: "Right", exact: true }).click();
    await expect(hub(page)).toBeVisible();
    expect(await page.evaluate(() => window.__pnqAppState().ear)).toBe("Right ear");
    // panic() rebuilds the output graph from the engine's current ear, so the
    // fresh panner's pan value reads the routing deterministically (the live
    // panner ramps via setTargetAtTime, which stalls while a headless context
    // is suspended).
    const pan = await page.evaluate(() => {
      const eng = window.__pnqAudioEngine;
      eng.panic();
      eng.play("probe2", [{ kind: "tone", pitch: 0.5, level: 0.3 }]);
      return window.__panners[window.__panners.length - 1].pan.value;
    });
    expect(pan).toBe(1);
    await page.evaluate(() => window.__pnqAudioEngine.stop());
  });
});
