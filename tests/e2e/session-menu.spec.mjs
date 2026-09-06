import { test, expect } from "@playwright/test";

async function boot(page) {
  await page.addInitScript(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
    ear: "Both ears", hp: true, vol: 100, setupSeen: true, eduSeen: true, optDone: {}, optOrder: []
  })));
  await page.goto("/");
  await expect(page.locator('[data-screen="home"]')).toBeVisible();
}

async function openMenu(page) {
  await page.getByRole("button", { name: "Session menu" }).click();
  await expect(page.getByText("SESSION MENU", { exact: true })).toBeVisible();
}

async function openJumps(page) {
  await openMenu(page);
  await page.getByRole("button", { name: "Jump to a different section" }).click();
}

function jumpGroup(page, cap) {
  return page.getByText(cap, { exact: true }).locator("..");
}

const playing = (page) => page.evaluate(() => window.__pnqAudioEngine.playingKey());
const state = (page) => page.evaluate(() => window.__pnqAppState());

test.describe("session menu", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the invisible hotspot is the only opener; opening hard-stops sound and both dismiss controls work", async ({ page }) => {
    await boot(page);
    await expect(page.getByText("SESSION MENU", { exact: true })).toHaveCount(0);

    const hotspot = page.getByRole("button", { name: "Session menu" });
    await expect(hotspot).toHaveCSS("width", "56px");
    await expect(hotspot).toHaveCSS("height", "44px");
    await expect(hotspot).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

    await openJumps(page);
    await jumpGroup(page, "OPTION 1").getByRole("button", { name: "Volume", exact: true }).click();
    await page.getByText("Start Sound", { exact: true }).click();
    await expect.poll(() => playing(page)).toBe("main");

    await openMenu(page);
    await expect(page.getByText("Option 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Sound stopped.", { exact: true })).toBeVisible();
    await expect.poll(() => playing(page)).toBe(null);
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.getByText("SESSION MENU", { exact: true })).toHaveCount(0);

    await openMenu(page);
    await page.getByRole("button", { name: "Close menu" }).click();
    await expect(page.getByText("SESSION MENU", { exact: true })).toHaveCount(0);
  });

  test("V5 scenario chips are grouped, visible, and land with runnable seeded state", async ({ page }) => {
    await boot(page);
    await openJumps(page);

    await expect(jumpGroup(page, "OPTION 1").getByRole("button", { name: "Extended · 5 passes", exact: true })).toBeVisible();
    await expect(jumpGroup(page, "OPTION 2").getByRole("button", { name: "Bounced back to directions", exact: true })).toBeVisible();
    await expect(jumpGroup(page, "OPTION 3").getByRole("button", { name: "Edge of the range", exact: true })).toBeVisible();
    await expect(jumpGroup(page, "SOUND-FAMILY GUIDED (PRESERVED)")).toBeVisible();
    await expect(jumpGroup(page, "ADAPTIVE REFINEMENT (PRESERVED)")).toBeVisible();
    await expect(jumpGroup(page, "LONGITUDINAL (PRESERVED)")).toBeVisible();
    await expect(jumpGroup(page, "EDUCATION · SOUND EXPLORATION (PRESERVED)")).toBeVisible();
    await expect(jumpGroup(page, "SHARED")).toBeVisible();

    await jumpGroup(page, "OPTION 1").getByRole("button", { name: "Extended · 5 passes", exact: true }).click();
    let s = await state(page);
    expect(s.concept).toBe("n");
    expect(s.stages.n).toBe("p3");
    expect(s.n.extra).toBe(2);
    await expect(page.getByText("Start Sound", { exact: true })).toBeVisible();

    await openJumps(page);
    await jumpGroup(page, "OPTION 2").getByRole("button", { name: "Bounced back to directions", exact: true }).click();
    s = await state(page);
    expect(s.concept).toBe("r");
    expect(s.stages.r).toBe("dir");
    expect(s.r.phase).toBe("pitch");
    await expect(page.getByText("Start Sound", { exact: true })).toBeVisible();

    await openJumps(page);
    await jumpGroup(page, "OPTION 3").getByRole("button", { name: "Edge of the range", exact: true }).click();
    s = await state(page);
    expect(s.concept).toBe("d");
    expect(s.stages.d).toBe("field");
    expect([s.d.heard, s.d.x, s.d.y]).toEqual([true, .96, .06]);
    await expect(page.getByRole("button", { name: "Play from here", exact: true })).toBeVisible();
  });

  test("technical values appear only when toggled and remain enabled across menu navigation", async ({ page }) => {
    await boot(page);
    await openJumps(page);
    await jumpGroup(page, "OPTION 1").getByRole("button", { name: "Pitch · fine", exact: true }).click();
    await expect(page.locator("[data-technical-values]")).toHaveCount(0);

    await openJumps(page);
    const toggle = page.getByRole("button", { name: "Toggle technical values" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.locator("[data-technical-values]")).toContainText(/Hz|kHz/);
    await expect(page.locator("[data-technical-values]")).toContainText("dB");

    await openJumps(page);
    await jumpGroup(page, "OPTION 3").getByRole("button", { name: "Whole field", exact: true }).click();
    await expect(page.locator("[data-technical-values]")).toBeVisible();
    expect((await state(page)).showTech).toBe(true);

    await openJumps(page);
    await page.getByRole("button", { name: "Toggle technical values" }).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(page.locator("[data-technical-values]")).toHaveCount(0);
    expect((await state(page)).showTech).toBe(false);
  });
});
