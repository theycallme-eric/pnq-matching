import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// Bare (phone-sized) presentation: below the 620px breakpoint the shell
// renders unscaled, so asset dimensions can be asserted exactly.
test.use({ viewport: { width: 390, height: 844 } });

test("launch screen loads the design system and renders the blue welcome mark", async ({ page }) => {
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

  // Blue waveform mark renders on the navy patient-app splash from the bundled asset.
  const mark = page.locator('img[src$="waveform-mark.svg"]');
  await expect(mark).toBeVisible();
  const box = await mark.boundingBox();
  expect(Math.round(box.width)).toBe(118);
  expect(Math.round(box.height)).toBe(40);

  // Launch chrome comes from design-system components.
  await expect(page.locator('[data-screen="launch"]')).toBeVisible();
  await expect(page.getByText("A guided sound-matching experience.")).toBeVisible();
  await expect(page.getByText(/prototype|fictional/i)).toHaveCount(0);
});

test("launch enters account setup directly and disabled buttons use the solid design-system treatment", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();

  await expect(page.locator('[data-screen-label="Create account"]')).toBeVisible();
  await expect(page.locator('[data-screen-label="Privacy"]')).toHaveCount(0);
  await expect(page.getByText(/privacy|prototype|fictional/i)).toHaveCount(0);

  const input = page.getByRole("textbox", { name: "Prescription ID" });
  await input.fill("a");
  const disabled = page.getByRole("button", { name: "Continue" });
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  await expect(disabled).toHaveCSS("background-color", "rgb(223, 226, 231)");
  const treatment = await disabled.evaluate((button) => {
    const tokenProbe = document.createElement("div");
    tokenProbe.style.background = "var(--interface-disabled)";
    document.body.append(tokenProbe);
    const result = {
      background: getComputedStyle(button).backgroundColor,
      borderStyle: getComputedStyle(button).borderStyle,
      tokenBackground: getComputedStyle(tokenProbe).backgroundColor
    };
    tokenProbe.remove();
    return result;
  });
  expect(treatment.borderStyle).not.toBe("dashed");
  expect(treatment.background).toBe(treatment.tokenBackground);
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
