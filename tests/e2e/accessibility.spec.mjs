import { test, expect } from "@playwright/test";
import { openSessionMenu, startSessionFromSplash } from "./onboarding-helpers.mjs";
import { REQUIRED_COPY } from "../../src/participant-copy.js";
import { auditApplicationParticipantStrings } from "../../src/app-copy.js";

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
  await openSessionMenu(page);
  await page.getByRole("button", { name: "Jump to a different section" }).click();
}

function jumpGroup(page, cap) {
  return page.getByText(cap, { exact: true }).locator("..");
}

async function participantText(page) {
  return page.locator("[data-device-frame]").evaluate((root) => {
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

async function accessibilityProblems(page, includeModerator = false) {
  return page.locator("[data-device-frame]").evaluate((root, auditModerator) => {
    const selector = 'button,input,select,textarea,a[href],[role="button"],[role="slider"]';
    const problems = [];
    for (const el of root.querySelectorAll(selector)) {
      if (!auditModerator && el.closest("[data-moderator-only]")) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const labelledBy = el.getAttribute("aria-labelledby");
      const referenced = labelledBy ? document.getElementById(labelledBy)?.textContent : "";
      const nativeLabel = [...(el.labels || [])].map((label) => label.textContent).join(" ");
      const name = (el.getAttribute("aria-label") || referenced || nativeLabel || el.textContent || "").replace(/\s+/g, " ").trim();
      const id = name || `<${el.tagName.toLowerCase()}>`;
      if (!name) problems.push(`${id}: missing accessible name`);
      if (rect.width < 44 || rect.height < 44) problems.push(`${id}: ${Math.round(rect.width)}x${Math.round(rect.height)} touch target`);
      if (el.hasAttribute("disabled") && el.getAttribute("aria-disabled") === "false") problems.push(`${id}: conflicting disabled semantics`);
    }
    return problems;
  }, includeModerator);
}

async function contrastProblems(page) {
  return page.locator("[data-device-frame]").evaluate((frame) => {
    const parse = (value) => {
      const match = value && value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const values = match[1].split(/[ ,/]+/).filter(Boolean).map(Number);
      return [values[0], values[1], values[2], values.length > 3 ? values[3] : 1];
    };
    const composite = (top, bottom) => {
      const alpha = top[3] + bottom[3] * (1 - top[3]);
      return [0, 1, 2].map((index) => (
        (top[index] * top[3] + bottom[index] * bottom[3] * (1 - top[3])) / alpha
      )).concat(alpha);
    };
    const luminance = (color) => {
      const channel = color.slice(0, 3).map((value) => {
        const normalized = value / 255;
        return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
      });
      return .2126 * channel[0] + .7152 * channel[1] + .0722 * channel[2];
    };
    const ratio = (a, b) => {
      const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (lighter + .05) / (darker + .05);
    };
    const backgrounds = (element) => {
      const path = [];
      for (let node = element; node instanceof Element; node = node.parentElement) path.unshift(node);
      let candidates = [[255, 255, 255, 1]];
      for (const node of path) {
        const style = getComputedStyle(node);
        const solid = parse(style.backgroundColor);
        if (solid && solid[3] > 0) candidates = candidates.map((base) => composite(solid, base));
        if (style.backgroundImage !== "none") {
          const stops = [...style.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((match) => parse(match[0])).filter(Boolean);
          if (stops.length) candidates = candidates.flatMap((base) => stops.map((stop) => composite(stop, base)));
        }
      }
      return candidates;
    };
    const problems = [];
    for (const element of frame.querySelectorAll("[data-screen] *, [role=dialog] *")) {
      const ownText = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(" ");
      if (!ownText || !element.getClientRects().length) continue;
      const foreground = parse(getComputedStyle(element).color);
      if (!foreground) continue;
      const ratios = backgrounds(element).map((background) => ratio(composite(foreground, background), background));
      const minimum = Math.min(...ratios);
      if (minimum < 4.5) problems.push(`${ownText.slice(0, 48)}: ${minimum.toFixed(2)}:1`);
    }
    return [...new Set(problems)];
  });
}

async function disableAuditMotion(page) {
  await page.addStyleTag({
    content: ":root { --dur-base: 0ms; }"
  });
}

async function expectVisibleFocus(locator) {
  await locator.focus();
  const focus = await locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      active: document.activeElement === element,
      outline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
      shadow: style.boxShadow !== "none"
    };
  });
  expect(focus.active).toBe(true);
  expect(focus.outline || focus.shadow).toBe(true);
}

async function finishOptionWithKeyboard(page, cap) {
  const matchingOptionsClose = page.getByRole("button", { name: "Close matching options" });
  if (await matchingOptionsClose.isVisible()) {
    await expectVisibleFocus(matchingOptionsClose);
    await matchingOptionsClose.press("Enter");
    await expect(page.locator("[data-matching-options-sheet]")).toHaveCount(0);
  }
  const menu = page.getByRole("button", { name: "Session menu" });
  await expectVisibleFocus(menu);
  await menu.press("Enter");
  const jumps = page.getByRole("button", { name: "Jump to a different section" });
  await expect(jumps).toHaveAttribute("aria-expanded", "false");
  await expectVisibleFocus(jumps);
  await jumps.press("Enter");
  await expect(jumps).toHaveAttribute("aria-expanded", "true");
  const group = page.getByText(cap, { exact: true }).locator("..");
  const confidence = group.getByRole("button", { name: "Confidence", exact: true });
  await expectVisibleFocus(confidence);
  await confidence.press("Enter");
  const choice = page.getByRole("button", { name: "Very close", exact: true });
  await expectVisibleFocus(choice);
  await choice.press("Space");
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  const finish = page.getByRole("button", { name: "Finish matching" });
  await expectVisibleFocus(finish);
  await finish.press("Enter");
  const completion = page.getByRole("button", { name: /Return to matching options|Finish session/ });
  await expectVisibleFocus(completion);
  await completion.press("Enter");
}

async function openCompletion(page, cap) {
  await openSessionMenu(page);
  await page.getByRole("button", { name: "Jump to a different section" }).click();
  const group = page.getByText(cap, { exact: true }).locator("..");
  await group.getByRole("button", { name: "Confidence", exact: true }).click();
  await page.getByRole("button", { name: "Very close", exact: true }).click();
  await page.getByRole("button", { name: "Finish matching" }).click();
  await expect(page.locator('[data-screen-label="Shared · Match complete"]')).toBeVisible();
}

test.describe("accessibility and participant copy", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("participant copy audit covers every immersive shell screen through the shared selector", async ({ page }) => {
    const problems = [];
    const auditScreen = async (name) => {
      for (const issue of auditApplicationParticipantStrings(await participantText(page))) problems.push(`${name}: ${issue}`);
    };

    await page.goto("/");
    await auditScreen("Launch");
    await page.getByRole("button", { name: "Get started" }).click();
    await auditScreen("Create account / entry");
    await page.getByRole("button", { name: "Continue" }).click();
    await auditScreen("Create account / confirmation");
    await page.getByRole("button", { name: "Yes, that's me" }).click();
    await auditScreen("Dashboard");
    await page.getByRole("button", { name: "New Session" }).click();
    await auditScreen("Setup / ear");
    await page.getByText("Both ears", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await auditScreen("Setup / headphones and volume");
    await page.getByRole("button", { name: /Headphones Plug in/ }).click();
    await page.getByLabel("Device volume").fill("100");
    await page.getByRole("button", { name: "Continue" }).click();
    await auditScreen("Matching options");

    expect(problems).toEqual([]);
  });

  test("accessibility: shell screens have named 44px controls and at least 4.5:1 text contrast", async ({ page }) => {
    const problems = [];
    const audit = async (name) => {
      for (const issue of await accessibilityProblems(page)) problems.push(`${name}: ${issue}`);
      for (const issue of await contrastProblems(page)) problems.push(`${name}: contrast ${issue}`);
    };

    await page.goto("/");
    // Contrast is measured on settled states. Disabling the vendored Button's
    // normal 250ms token transition prevents a reused Setup action node from
    // being sampled between its disabled and Education styles in slower CI.
    await disableAuditMotion(page);
    await audit("Launch");
    await page.getByRole("button", { name: "Get started" }).click();
    await audit("Account entry");
    await page.getByRole("button", { name: "Continue" }).click();
    await audit("Account confirmation");
    await page.getByRole("button", { name: "Yes, that's me" }).click();
    await audit("Dashboard");
    await page.getByRole("button", { name: "New Session" }).click();
    await audit("Ear");
    await page.getByRole("button", { name: "Continue" }).evaluate((button) => button.click());
    await expect(page.getByRole("alert")).toContainText("Action needed: Choose an ear to continue.");
    await audit("Ear error");
    await page.getByRole("button", { name: "Both ears", exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await audit("Setup");
    await page.getByRole("button", { name: /Headphones/ }).click();
    await page.getByLabel("Device volume").fill("100");
    await page.getByRole("button", { name: "Continue" }).click();
    await audit("Matching options");
    await openSessionMenu(page);
    await page.getByRole("button", { name: "Jump to a different section" }).click();
    for (const issue of await accessibilityProblems(page, true)) problems.push(`Session menu: ${issue}`);
    for (const issue of await contrastProblems(page)) problems.push(`Session menu: contrast ${issue}`);
    await page.getByRole("button", { name: "Close", exact: true }).click();

    for (const cap of ["OPTION 1", "OPTION 2", "OPTION 3"]) {
      await openCompletion(page, cap);
      await audit(`${cap} completion`);
      await page.getByRole("button", { name: /Return to matching options|Finish session/ }).click();
    }
    await expect(page.locator('[data-screen-label="Session complete"]')).toBeVisible();
    await audit("Conclusion");

    expect(problems).toEqual([]);
  });

  test("keyboard: shell controls expose focus and state through completion, conclusion, menu, and reset", async ({ page }) => {
    await page.goto("/");
    const start = page.getByRole("button", { name: "Get started" });
    await expectVisibleFocus(start);
    await start.press("Enter");

    const input = page.getByRole("textbox", { name: "Prescription ID" });
    await input.fill("a");
    const accountContinue = page.getByRole("button", { name: "Continue" });
    await expect(accountContinue).toHaveAttribute("aria-disabled", "true");
    await expect(accountContinue).not.toHaveCSS("border-style", "dashed");
    await expectVisibleFocus(input);
    await input.press("ControlOrMeta+A");
    await input.pressSequentially("PNQ-KEYBOARD");
    const onboardingBack = page.getByRole("button", { name: "Back" });
    await expectVisibleFocus(onboardingBack);
    await onboardingBack.press("Enter");
    await expect(page.locator('[data-screen-label="Launch"]')).toBeVisible();
    await page.getByRole("button", { name: "Get started" }).press("Enter");
    await page.getByRole("button", { name: "Continue" }).press("Enter");
    await page.getByRole("button", { name: "Yes, that's me" }).press("Enter");

    const newSession = page.getByRole("button", { name: "New Session" });
    await expectVisibleFocus(newSession);
    await newSession.press("Enter");
    const ear = page.getByRole("button", { name: "Both ears", exact: true });
    await expect(ear).toHaveAttribute("aria-pressed", "false");
    await expectVisibleFocus(ear);
    await ear.press("Space");
    await expect(ear).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Continue" }).press("Enter");

    const shellBack = page.getByRole("button", { name: "Back" });
    await expectVisibleFocus(shellBack);
    await shellBack.press("Enter");
    await expect(ear).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Continue" }).press("Enter");
    const headphones = page.getByRole("button", { name: /Headphones/ });
    await expect(headphones).toHaveAttribute("aria-pressed", "false");
    await expectVisibleFocus(headphones);
    await headphones.press("Space");
    await expect(headphones).toHaveAttribute("aria-pressed", "true");
    await expect(headphones).toContainText("Connected");
    const volume = page.getByRole("slider", { name: "Device volume" });
    await expectVisibleFocus(volume);
    await volume.press("End");
    await expect(volume).toHaveValue("100");
    await page.getByRole("button", { name: "Continue" }).press("Enter");

    const option = page.getByRole("button", { name: "Option 1" });
    await expectVisibleFocus(option);
    await option.press("Enter");
    await expect(option).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();
    const matchingContinue = page.getByRole("button", { name: "Continue", exact: true });
    await expectVisibleFocus(matchingContinue);
    await matchingContinue.press("Enter");
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();
    await page.getByRole("button", { name: "Back" }).press("Enter");
    await expect(page.locator('[data-screen-label="Matching options"]')).toBeVisible();

    await finishOptionWithKeyboard(page, "OPTION 1");
    await expect(page.getByText("Done", { exact: true })).toHaveCount(0);
    await expect(page.locator('[data-option-id="1"]')).toHaveAttribute("data-option-state", "available");
    await finishOptionWithKeyboard(page, "OPTION 2");
    await finishOptionWithKeyboard(page, "OPTION 3");
    await expect(page.locator('[data-screen-label="Session complete"]')).toBeVisible();

    const menu = page.getByRole("button", { name: "Session menu" });
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expectVisibleFocus(menu);
    await menu.press("Enter");
    await expect(menu).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("dialog", { name: "Session menu" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Close", exact: true })).toBeFocused();
    const reset = page.getByRole("button", { name: "Reset application" });
    await expectVisibleFocus(reset);
    await reset.press("Enter");
    await expect(page.locator('[data-screen-label="Launch"]')).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem("pnq-mtp-v1"))).toBeNull();
  });

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
        for (const issue of auditApplicationParticipantStrings(copy)) allProblems.push(`${where}: ${issue}`);
        for (const issue of await accessibilityProblems(page)) allProblems.push(`${where}: ${issue}`);
      }
    }

    expect(pageErrors).toEqual([]);
    expect(allProblems).toEqual([]);
    expect(allCopy.some((text) => text.includes(REQUIRED_COPY.reassurance))).toBe(true);
    for (const option of REQUIRED_COPY.options) expect(allCopy.some((text) => text.includes(option))).toBe(true);
  });

  test("accessibility: every option remains selectable whenever the sheet opens", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.clear());
    await page.goto("/");
    await page.evaluate(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
      ear: "Both ears", hp: false, vol: 36, setupSeen: false, eduSeen: false, optDone: {}, optOrder: []
    })));
    await page.reload();
    await startSessionFromSplash(page);
    const bothEars = page.getByRole("button", { name: "Both ears", exact: true });
    await expect(bothEars).toHaveAttribute("aria-pressed", "false");
    await bothEars.press("Space");
    await expect(bothEars).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Continue" }).click();
    await openSessionMenu(page);
    await page.getByRole("button", { name: "Return to matching options" }).click();
    const option = page.getByRole("button", { name: "Option 1" });
    await expect(option).not.toHaveAttribute("aria-disabled", /.*/);
    await expect(option).toHaveAttribute("aria-pressed", "false");
    await option.evaluate((element) => element.click());
    await expect(page.locator('[data-screen="home"]')).toBeVisible();
    await expect(option).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator('[data-screen-label="Narrowing · Refinement pass"]')).toBeVisible();
  });
});
