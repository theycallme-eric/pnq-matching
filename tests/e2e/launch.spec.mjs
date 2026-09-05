import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Bare (phone-sized) presentation: below the 620px breakpoint the shell
// renders unscaled, so asset dimensions can be asserted exactly.
test.use({ viewport: { width: 390, height: 844 } });

test("launch screen loads the design system and renders the navy mark at 34px", async ({ page }) => {
  await page.goto("/");

  // Component bundle is loaded and exposes the documented components.
  const componentNames = await page.evaluate(() =>
    Object.keys(window.PNQHealthDesignSystem_deabce ?? {})
  );
  for (const name of ["Button", "SelectRow", "SegmentedControl", "TuningSlider", "PlayToggle", "Card", "CardDivider", "IconTile", "Icon", "SectionLabel", "InlineAlert", "StatusBar", "HomeIndicator"]) {
    expect(componentNames).toContain(name);
  }

  // Token stylesheets applied: body background resolves from --interface-app (#f6f7f9).
  const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bodyBg).toBe("rgb(246, 247, 249)");

  // Navy waveform mark renders on Launch at 34x34 from the bundled SVG asset.
  const mark = page.locator('img[src$="waveform-mark-navy.svg"]');
  await expect(mark).toBeVisible();
  const box = await mark.boundingBox();
  expect(Math.round(box.width)).toBe(34);
  expect(Math.round(box.height)).toBe(34);

  // Launch chrome comes from design-system components.
  await expect(page.locator('[data-screen="launch"]')).toBeVisible();
  await expect(page.getByText("Let's find the sound you hear")).toBeVisible();
});

test("both waveform mark variants are served byte-for-byte from the built bundle", async ({ request }) => {
  for (const asset of ["assets/waveform-mark-navy.svg", "assets/waveform-mark.svg"]) {
    const response = await request.get(`/${asset}`);
    expect(response.ok()).toBe(true);
    const served = Buffer.from(await response.body());
    const source = readFileSync(join(root, asset));
    expect(served.equals(source)).toBe(true);
  }
});
