import { test, expect } from "@playwright/test";

async function restoreReadyOptions(page) {
  await page.addInitScript(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
    onboardingSeen: true,
    earSeen: true,
    setupSeen: true,
    eduSeen: true,
    optDone: {},
    optOrder: []
  })));
  await page.goto("/");
  await expect(page.locator("[data-matching-options-sheet]")).toBeVisible();
}

test.describe("matching-options full-device bottom sheet", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens over the screen footer and blocks its hidden session hotspot", async ({ page }) => {
    await restoreReadyOptions(page);

    const frame = page.locator("[data-device-frame]");
    const screen = page.locator('[data-screen-label="Matching options"]');
    const context = page.locator("[data-matching-options-context]");
    const footer = page.locator("[data-shell-footer]");
    const layer = page.locator("[data-matching-options-layer]");
    const sheet = page.locator("[data-matching-options-sheet]");

    await expect(context).toHaveAttribute("aria-hidden", "true");
    await expect(context).toHaveAttribute("inert", "");
    await expect(footer).toHaveAttribute("aria-hidden", "true");
    await expect(footer).toHaveAttribute("inert", "");
    const titleBox = await page.locator("#matching-options-title").boundingBox();
    expect(titleBox.height).toBeLessThan(32);

    const geometry = await layer.evaluate((layerNode) => {
      const rect = (node) => {
        const box = node.getBoundingClientRect();
        return { top: box.top, right: box.right, bottom: box.bottom, left: box.left };
      };
      const frameNode = layerNode.parentElement;
      const screenNode = frameNode.querySelector('[data-screen-label="Matching options"]');
      const footerNode = frameNode.querySelector("[data-shell-footer]");
      const sheetNode = layerNode.querySelector("[data-matching-options-sheet]");
      const footerBox = footerNode.getBoundingClientRect();
      const hit = document.elementFromPoint(
        footerBox.left + footerBox.width / 2,
        footerBox.top + footerBox.height / 2
      );
      return {
        directChild: frameNode.matches("[data-device-frame]"),
        frame: rect(frameNode),
        screen: rect(screenNode),
        footer: rect(footerNode),
        layer: rect(layerNode),
        sheet: rect(sheetNode),
        footerHitIsInLayer: layerNode.contains(hit)
      };
    });

    expect(geometry.directChild).toBe(true);
    expect(geometry.layer.left).toBeCloseTo(geometry.frame.left, 0);
    expect(geometry.layer.right).toBeCloseTo(geometry.frame.right, 0);
    expect(geometry.layer.top).toBeLessThanOrEqual(geometry.screen.top + 0.5);
    expect(geometry.layer.bottom).toBeCloseTo(geometry.frame.bottom, 0);
    expect(geometry.layer.bottom).toBeGreaterThanOrEqual(geometry.footer.bottom);
    expect(geometry.sheet.bottom).toBeCloseTo(geometry.frame.bottom, 0);
    expect(geometry.footerHitIsInLayer).toBe(true);

    const footerBox = await footer.boundingBox();
    await page.mouse.click(footerBox.x + footerBox.width / 2, footerBox.y + footerBox.height / 2);
    await expect(page.getByRole("dialog", { name: "Session menu" })).toHaveCount(0);
    await expect(sheet).toBeVisible();
    await expect(screen).toBeVisible();
    await expect(frame).toBeVisible();
  });

  test("visible close dismisses without applying and restores the hidden hotspot", async ({ page }) => {
    await restoreReadyOptions(page);

    const third = page.getByRole("button", { name: "Option 3", exact: true });
    await third.click();
    await expect(third).toHaveAttribute("aria-pressed", "true");

    const close = page.getByRole("button", { name: "Close matching options", exact: true });
    await expect(close).toBeVisible();
    await close.click();

    await expect(page.locator("[data-matching-options-layer]")).toHaveCount(0);
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    await expect(page.locator("[data-matching-options-context]")).not.toHaveAttribute("aria-hidden", "true");
    await expect(page.locator("[data-shell-footer]")).not.toHaveAttribute("aria-hidden", "true");
    const state = await page.evaluate(() => window.__pnqAppState());
    expect(state.screen).toBe("home");
    expect(state.concept).toBe("n");

    await page.getByRole("button", { name: "Session menu" }).click();
    await expect(page.getByRole("dialog", { name: "Session menu" })).toBeVisible();
    await page.getByRole("button", { name: "Jump to a different section" }).click();
    await page.getByText("SHARED", { exact: true }).locator("..").getByRole("button", { name: "Matching options", exact: true }).click();

    await expect(page.locator("[data-matching-options-sheet]")).toBeVisible();
    await expect(page.getByRole("button", { name: "Option 3", exact: true })).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
  });

  test("selection alone enables Continue and Continue separately advances", async ({ page }) => {
    await restoreReadyOptions(page);

    const continueButton = page.getByRole("button", { name: "Continue", exact: true });
    const second = page.getByRole("button", { name: "Option 2", exact: true });
    await expect(continueButton).toBeDisabled();

    await second.click();
    await expect(second).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[aria-pressed="true"][data-option-state="selected"]')).toHaveCount(1);
    await expect(continueButton).toBeEnabled();
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();

    await continueButton.click();
    await expect(page.locator('[data-screen-label="Shared · Listen and respond"]')).toBeVisible();
    expect(await page.evaluate(() => window.__pnqAppState().concept)).toBe("r");
  });

  test("keeps the completion summary visible behind the reopened sheet", async ({ page }) => {
    await restoreReadyOptions(page);
    await page.getByRole("button", { name: "Option 2", exact: true }).click();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Session menu" }).click();
    await page.getByRole("button", { name: "Jump to a different section" }).click();
    await page.getByText("OPTION 2", { exact: true }).locator("..").getByRole("button", { name: "Confidence", exact: true }).click();
    await page.getByRole("button", { name: "Fairly close", exact: true }).click();
    await page.getByRole("button", { name: "Finish matching", exact: true }).click();
    await page.getByRole("button", { name: "Return to matching options", exact: true }).click();

    const context = page.locator('[data-matching-options-context="completion"]');
    await expect(context).toBeVisible();
    await expect(context).toContainText("That’s this one done");
    await expect(page.locator("[data-matching-options-sheet]")).toBeVisible();
  });
});
