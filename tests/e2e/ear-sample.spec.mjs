import { test, expect } from "@playwright/test";
import { startSessionFromSplash } from "./onboarding-helpers.mjs";

async function installAudioProbe(page) {
  await page.addInitScript(() => {
    const probe = { pan: null, panHistory: [], starts: 0 };

    class AudioParam {
      constructor(value, trackPan = false) {
        this._value = value;
        this.trackPan = trackPan;
        if (trackPan) probe.pan = value;
      }
      get value() { return this._value; }
      set value(value) {
        this._value = value;
        if (this.trackPan) {
          probe.pan = value;
          probe.panHistory.push(value);
        }
      }
      cancelScheduledValues() {}
      setValueAtTime(value) { this.value = value; }
      linearRampToValueAtTime(value) { this.value = value; }
      setTargetAtTime(value) { this.value = value; }
    }

    class AudioNode {
      constructor() { this.connections = []; }
      connect(destination) { this.connections.push(destination); }
      disconnect() { this.connections = []; }
    }

    class AudioSource extends AudioNode {
      constructor() {
        super();
        this.frequency = new AudioParam(440);
        this.type = "sine";
      }
      start() { probe.starts += 1; }
      stop() {}
    }

    class AudioContextProbe {
      constructor() {
        this.state = "running";
        this.currentTime = 0;
        this.sampleRate = 8000;
        this.destination = new AudioNode();
      }
      resume() { this.state = "running"; }
      createGain() {
        const node = new AudioNode();
        node.gain = new AudioParam(1);
        return node;
      }
      createStereoPanner() {
        const node = new AudioNode();
        node.pan = new AudioParam(0, true);
        return node;
      }
      createOscillator() { return new AudioSource(); }
    }

    window.AudioContext = AudioContextProbe;
    window.webkitAudioContext = AudioContextProbe;
    window.__earSampleAudio = probe;
  });
}

test.describe("ear-selection sample playback", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await installAudioProbe(page);
    await page.goto("/");
    await startSessionFromSplash(page);
  });

  test("routes the existing sample left, right, and both and uses a changed selection next", async ({ page }) => {
    const ear = page.locator('[data-screen-label="Setup · Ear"]');
    const sample = ear.getByRole("button", { name: "Play sample sound" });
    const cont = ear.getByRole("button", { name: "Continue" });

    await expect(sample).toBeVisible();
    await expect(sample).toHaveAttribute("aria-disabled", "true");
    await expect(cont).toHaveAttribute("aria-disabled", "true");

    for (const [label, expectedPan] of [
      ["Left ear", -1],
      ["Right ear", 1],
      ["Both ears", 0]
    ]) {
      const selectedOption = ear.getByRole("button", { name: label, exact: true });
      await selectedOption.click();
      await expect(selectedOption).toHaveAttribute("aria-pressed", "true");
      await expect(cont).not.toHaveAttribute("aria-disabled", "true");
      await expect(sample).not.toHaveAttribute("aria-disabled", "true");
      await sample.click();
      await expect.poll(() => page.evaluate(() => window.__earSampleAudio.pan)).toBe(expectedPan);
      await expect.poll(() => page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe("ear-sample");
      await expect(ear.getByRole("button", { name: "Stop sample sound" })).toHaveAttribute("aria-pressed", "true");
      await ear.getByRole("button", { name: "Stop sample sound" }).click();
    }

    // The existing neutral test tone has a fundamental plus its soft harmonic.
    expect(await page.evaluate(() => window.__earSampleAudio.starts)).toBe(6);
  });

  test("selection alone enables Continue and advances without sample playback", async ({ page }) => {
    const ear = page.locator('[data-screen-label="Setup · Ear"]');
    await ear.getByRole("button", { name: "Right ear", exact: true }).click();
    await ear.getByRole("button", { name: "Continue" }).click();

    await expect(page.locator('[data-screen-label="Setup · Headphones and volume"]')).toBeVisible();
    expect(await page.evaluate(() => window.__earSampleAudio.starts)).toBe(0);
    expect(await page.evaluate(() => window.__pnqAudioEngine.playingKey())).toBe(null);
  });
});
