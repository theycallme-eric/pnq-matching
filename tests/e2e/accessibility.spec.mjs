import { test, expect } from "@playwright/test";
import { auditParticipantStrings, REQUIRED_COPY } from "../../src/participant-copy.js";

const GROUPS = [
  "OPTION 1", "OPTION 2", "OPTION 3", "SOUND-FAMILY GUIDED (PRESERVED)",
  "ADAPTIVE REFINEMENT (PRESERVED)", "LONGITUDINAL (PRESERVED)",
  "EDUCATION · SOUND EXPLORATION (PRESERVED)", "SHARED"
];

async function boot(page) {
  await page.addInitScript(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
    ear: "Both ears", hp: true, vol: 100, setupSeen: true, eduSeen: true, optDone: {}, optOrder: []
  })));
  await page.goto("/");
  await expect(page.locator('[data-screen="home"]')).toBeVisible();
}

async function openJumps(page) {
  await page.getByRole("button", { name: "Session menu" }).click();
  await page.getByRole("button", { name: "Jump to a different section" }).click();
}

function jumpGroup(page, cap) {
  return page.getByText(cap, { exact: true }).locator("..");
}

async function participantText(page) {
  return page.locator("[data-screen]").evaluate((root) => {
    const values = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement?.closest("[data-moderator-only]")) continue;
      const value = node.textContent.replace(/\s+/g, " ").trim();
      if (value) values.push(value);
    }
    return values;
  });
}

async function accessibilityProblems(page) {
  return page.locator("[data-screen]").evaluate((root) => {
    const selector = 'button,input,select,textarea,a[href],[role="button"],[role="slider"]';
    const problems = [];
    for (const el of root.querySelectorAll(selector)) {
      if (el.closest("[data-moderator-only]")) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const labelledBy = el.getAttribute("aria-labelledby");
      const referenced = labelledBy ? document.getElementById(labelledBy)?.textContent : "";
      const name = (el.getAttribute("aria-label") || referenced || el.textContent || "").replace(/\s+/g, " ").trim();
      const id = name || `<${el.tagName.toLowerCase()}>`;
      if (!name) problems.push(`${id}: missing accessible name`);
      if (rect.width < 44 || rect.height < 44) problems.push(`${id}: ${Math.round(rect.width)}x${Math.round(rect.height)} touch target`);
      if (el.hasAttribute("disabled") && el.getAttribute("aria-disabled") === "false") problems.push(`${id}: conflicting disabled semantics`);
    }
    return problems;
  });
}

test.describe("accessibility and participant copy", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("accessibility: every V5 jump destination has named 44px controls and audited participant copy", async ({ page }) => {
    test.setTimeout(120000);
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await boot(page);

    const allCopy = [...await participantText(page)];
    const allProblems = [];

    for (const cap of GROUPS) {
      await openJumps(page);
      const labels = await jumpGroup(page, cap).getByRole("button").allTextContents();
      await page.getByRole("button", { name: "Close", exact: true }).click();

      for (const label of labels) {
        await openJumps(page);
        await jumpGroup(page, cap).getByRole("button", { name: label.trim(), exact: true }).click();
        await expect(page.locator("[data-screen]")).toBeVisible();
        const where = `${cap} / ${label.trim()}`;
        const copy = await participantText(page);
        allCopy.push(...copy);
        for (const issue of auditParticipantStrings(copy)) allProblems.push(`${where}: ${issue}`);
        for (const issue of await accessibilityProblems(page)) allProblems.push(`${where}: ${issue}`);
      }
    }

    expect(pageErrors).toEqual([]);
    expect(allProblems).toEqual([]);
    expect(allCopy.some((text) => text.includes(REQUIRED_COPY.reassurance))).toBe(true);
    for (const option of REQUIRED_COPY.options) expect(allCopy.some((text) => text.includes(option))).toBe(true);
  });

  test("accessibility: locked options expose aria-disabled and do not navigate", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.clear());
    await page.goto("/");
    await page.evaluate(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
      ear: "Both ears", hp: false, vol: 36, setupSeen: false, eduSeen: false, optDone: {}, optOrder: []
    })));
    await page.reload();
    await page.getByRole("button", { name: "Get started" }).click();
    await page.getByText("Both ears", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Session menu" }).click();
    await page.getByRole("button", { name: "Return to matching options" }).click();
    const option = page.getByRole("button", { name: "Option 1" });
    await expect(option).toHaveAttribute("aria-disabled", "true");
    await option.evaluate((element) => element.click());
    await expect(page.locator('[data-screen="home"]')).toBeVisible();
  });
});
