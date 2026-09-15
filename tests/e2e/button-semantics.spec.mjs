import { test, expect } from "@playwright/test";
import { openSessionMenu } from "./onboarding-helpers.mjs";

const variants = ["primary", "solid", "outline", "ghost"];
const themes = [
  { name: "light", onDark: false, background: "var(--interface-app)" },
  { name: "dark", onDark: true, background: "var(--interface-dark)" }
];

async function renderButtonFixture(page, { disabled = false, theme }) {
  await page.goto("/");
  await page.addStyleTag({ content: ":root { --dur-base: 0ms; }" });
  await page.evaluate(({ disabled, theme, variants }) => {
    document.querySelector("#button-semantics-fixture")?.remove();
    const host = document.createElement("div");
    host.id = "button-semantics-fixture";
    host.style.cssText = [
      "position:fixed", "inset:0", "z-index:9999", `background:${theme.background}`,
      "padding:48px", "display:flex", "flex-direction:column", "gap:16px"
    ].join(";");
    document.body.append(host);
    const DS = window.PNQHealthDesignSystem_deabce;
    ReactDOM.render(
      React.createElement(
        "div",
        { style: { width: "280px", display: "flex", flexDirection: "column", gap: "16px" } },
        ...variants.map((variant) => React.createElement(
          DS.Button,
          {
            key: variant,
            variant,
            size: "md",
            disabled,
            onDark: theme.onDark,
            "aria-label": `${theme.name} ${variant}`
          },
          `${variant} label`
        ))
      ),
      host
    );
  }, { disabled, theme, variants });
}

async function renderActionShadowFixture(page) {
  await page.goto("/");
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "action-shadow-fixture";
    host.style.cssText = "position:fixed;inset:0;z-index:9999;background:var(--interface-app);padding:32px;display:grid;gap:12px";
    document.body.append(host);
    const DS = window.PNQHealthDesignSystem_deabce;
    ReactDOM.render(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(DS.Button, { variant: "primary", size: "md", "data-action-control": "primary" }, "Primary"),
        React.createElement(DS.Button, { variant: "solid", size: "md", "data-action-control": "solid" }, "Solid"),
        React.createElement("div", { "data-action-control": "hero" }, React.createElement(DS.HeroActionCard, {
          eyebrow: "Hero", title: "Hero action", description: "Fixture"
        })),
        React.createElement(DS.Button, {
          variant: "primary", size: "lg", "data-action-control": "tall", style: { boxShadow: "var(--shadow-action-tall)" }
        }, "Tall"),
        React.createElement(DS.Button, { variant: "primary", size: "sm", "data-action-control": "small" }, "Small"),
        React.createElement(DS.Button, {
          variant: "solid", size: "xs", "data-action-control": "extra-small", style: { boxShadow: "var(--shadow-action-xs)" }
        }, "Extra small")
      ),
      host
    );
  });
}

async function resolvedShadow(locator) {
  return locator.evaluate((element) => {
    const value = getComputedStyle(element).boxShadow;
    const color = value.match(/rgba?\(([^)]+)\)/);
    const lengths = value.replace(/rgba?\([^)]+\)/, "").match(/-?[\d.]+px/g)?.map(parseFloat) || [];
    const channels = color[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return {
      x: lengths[0],
      y: lengths[1],
      blur: lengths[2],
      rgb: channels.slice(0, 3),
      alpha: channels.length > 3 ? channels[3] : 1
    };
  });
}

async function snapshot(button) {
  return button.evaluate((element) => {
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
      const channels = color.slice(0, 3).map((value) => {
        const normalized = value / 255;
        return normalized <= .04045 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
      });
      return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
    };
    const ratio = (first, second) => {
      const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
      return (values[0] + .05) / (values[1] + .05);
    };

    const path = [];
    for (let node = element.parentElement; node instanceof Element; node = node.parentElement) path.unshift(node);
    let backdrop = [255, 255, 255, 1];
    for (const node of path) {
      const color = parse(getComputedStyle(node).backgroundColor);
      if (color && color[3] > 0) backdrop = composite(color, backdrop);
    }

    const style = getComputedStyle(element);
    const solid = parse(style.backgroundColor) || [0, 0, 0, 0];
    const gradientStops = [...style.backgroundImage.matchAll(/rgba?\([^)]+\)/g)]
      .map((match) => parse(match[0]))
      .filter(Boolean);
    const backgrounds = gradientStops.length
      ? gradientStops.map((color) => composite(color, backdrop))
      : [composite(solid, backdrop)];
    const foreground = parse(style.color);
    const labelContrast = Math.min(...backgrounds.map((background) => (
      ratio(composite(foreground, background), background)
    )));

    const border = parse(style.borderTopColor);
    const renderedBorders = border
      ? backgrounds.map((background) => composite(border, background))
      : [];
    const boundaryContrast = renderedBorders.length
      ? Math.min(...renderedBorders.flatMap((rendered, index) => [
        ratio(rendered, backgrounds[index]),
        ratio(rendered, backdrop)
      ]))
      : 1;

    const outline = parse(style.outlineColor);
    const focusContrast = outline ? ratio(composite(outline, backdrop), backdrop) : 1;
    const rect = element.getBoundingClientRect();
    return {
      geometry: {
        width: rect.width,
        height: rect.height,
        borderTopWidth: style.borderTopWidth,
        borderRightWidth: style.borderRightWidth,
        borderBottomWidth: style.borderBottomWidth,
        borderLeftWidth: style.borderLeftWidth,
        borderRadius: style.borderRadius,
        paddingTop: style.paddingTop,
        paddingRight: style.paddingRight,
        paddingBottom: style.paddingBottom,
        paddingLeft: style.paddingLeft,
        gap: style.gap,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight
      },
      labelContrast,
      boundaryContrast,
      focusContrast,
      outlineWidth: parseFloat(style.outlineWidth),
      borderStyle: style.borderTopStyle,
      borderColor: style.borderTopColor,
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      backgroundAlpha: solid[3],
      focusVisible: element.matches(":focus-visible"),
      active: element.matches(":active")
    };
  });
}

async function stateSnapshots(page, button) {
  const normal = await snapshot(button);

  await button.hover();
  const hover = await snapshot(button);

  const box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const active = await snapshot(button);
  await page.mouse.up();

  await button.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  const focus = await snapshot(button);

  return { normal, hover, active, focus };
}

test.describe("shared Button semantics", () => {
  test.use({ viewport: { width: 900, height: 720 } });

  test("action controls resolve to the restrained shared shadow family", async ({ page }) => {
    await renderActionShadowFixture(page);
    const expected = {
      primary: { x: 0, y: 5, blur: 11, rgb: [31, 127, 196], alpha: .2 },
      solid: { x: 0, y: 2, blur: 6, rgb: [90, 169, 226], alpha: .2 },
      hero: { x: 0, y: 8, blur: 17, rgb: [31, 127, 196], alpha: .2 },
      tall: { x: 0, y: 6, blur: 13, rgb: [31, 127, 196], alpha: .2 },
      small: { x: 0, y: 5, blur: 11, rgb: [31, 127, 196], alpha: .2 },
      "extra-small": { x: 0, y: 2, blur: 6, rgb: [47, 124, 192], alpha: .17 }
    };

    for (const [control, shadow] of Object.entries(expected)) {
      const locator = control === "hero"
        ? page.locator('[data-action-control="hero"] > div')
        : page.locator(`[data-action-control="${control}"]`);
      expect(await resolvedShadow(locator), `${control} resting shadow`).toEqual(shadow);
    }
  });

  for (const theme of themes) {
    test(`${theme.name} variants meet label, boundary, focus, and geometry thresholds in every enabled state`, async ({ page }) => {
      await renderButtonFixture(page, { theme });

      for (const variant of variants) {
        const button = page.getByRole("button", { name: `${theme.name} ${variant}` });
        const states = await stateSnapshots(page, button);
        for (const [state, result] of Object.entries(states)) {
          expect(result.labelContrast, `${variant} ${state} label contrast`).toBeGreaterThanOrEqual(4.5);
          expect(result.geometry, `${variant} ${state} geometry`).toEqual(states.normal.geometry);
        }
        expect(states.active.active, `${variant} exposes a real :active state`).toBe(true);
        expect(states.focus.focusVisible, `${variant} exposes a real :focus-visible state`).toBe(true);
        expect(states.focus.outlineWidth, `${variant} focus indicator width`).toBeGreaterThanOrEqual(3);
        expect(states.focus.focusContrast, `${variant} focus indicator contrast`).toBeGreaterThanOrEqual(3);
        if (variant === "outline") {
          for (const [state, result] of Object.entries(states)) {
            expect(result.boundaryContrast, `outline ${state} boundary contrast`).toBeGreaterThanOrEqual(3);
          }
        }
      }
    });
  }

  test("disabled variants retain enabled geometry, legible labels, and distinct identities", async ({ page }) => {
    for (const theme of themes) {
      await renderButtonFixture(page, { theme });
      const enabled = Object.fromEntries(await Promise.all(variants.map(async (variant) => [
        variant,
        await snapshot(page.getByRole("button", { name: `${theme.name} ${variant}` }))
      ])));

      await renderButtonFixture(page, { disabled: true, theme });
      const disabled = {};
      for (const variant of variants) {
        const button = page.getByRole("button", { name: `${theme.name} ${variant}` });
        const states = await stateSnapshots(page, button);
        disabled[variant] = states.normal;
        for (const [state, result] of Object.entries(states)) {
          expect(result.geometry, `${theme.name} ${variant} disabled ${state} geometry`).toEqual(enabled[variant].geometry);
          expect(result.labelContrast, `${theme.name} ${variant} disabled ${state} label remains legible`).toBeGreaterThanOrEqual(4.5);
          expect(result.backgroundColor, `${theme.name} ${variant} disabled ${state} fill stays stable`).toBe(states.normal.backgroundColor);
          expect(result.backgroundImage, `${theme.name} ${variant} disabled ${state} fill stays stable`).toBe(states.normal.backgroundImage);
        }
        expect(states.focus.focusVisible, `${theme.name} ${variant} disabled focus remains visible`).toBe(true);
        expect(states.focus.focusContrast, `${theme.name} ${variant} disabled focus contrast`).toBeGreaterThanOrEqual(3);
      }
      expect(disabled.primary.backgroundImage).not.toBe("none");
      expect(disabled.solid.backgroundImage).toBe("none");
      expect(disabled.solid.backgroundAlpha).toBe(1);
      expect(disabled.outline.backgroundImage).toBe("none");
      expect(disabled.outline.borderStyle).toBe("solid");
      expect(parseFloat(disabled.outline.geometry.borderTopWidth)).toBeGreaterThan(0);
      expect(disabled.ghost.backgroundImage).toBe("none");
      expect(disabled.ghost.backgroundAlpha).toBe(0);
      expect(disabled.ghost.borderStyle).toBe("solid");
      expect(disabled.ghost.borderColor).toBe("rgba(0, 0, 0, 0)");
    }
  });
});

test.describe("Option 2 Button identity", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("both This one controls remain outline with stable geometry across the audition gate and interactions", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("pnq-mtp-v1", JSON.stringify({
      ear: "Both ears", hp: true, vol: 100, setupSeen: true, eduSeen: true, optDone: {}, optOrder: []
    })));
    await page.goto("/");
    await openSessionMenu(page);
    await page.getByRole("button", { name: "Jump to a different section" }).click();
    await page.getByRole("button", { name: "A/B comparisons", exact: true }).click();
    await page.addStyleTag({ content: ":root { --dur-base: 0ms; }" });

    const choices = page.getByRole("button", { name: "This one" });
    const before = [await snapshot(choices.first()), await snapshot(choices.nth(1))];
    for (const choice of before) {
      expect(choice.borderStyle).toBe("solid");
      expect(parseFloat(choice.geometry.borderTopWidth)).toBeGreaterThan(0);
      expect(choice.backgroundImage).toBe("none");
    }

    await page.getByRole("button", { name: "Play sound 1" }).click();
    await page.getByRole("button", { name: "Play sound 2" }).click();
    const after = [await snapshot(choices.first()), await snapshot(choices.nth(1))];
    for (let index = 0; index < 2; index += 1) {
      expect(after[index].geometry).toEqual(before[index].geometry);
      expect(after[index].borderStyle).toBe("solid");
      expect(parseFloat(after[index].geometry.borderTopWidth)).toBeGreaterThan(0);
    }

    const states = await stateSnapshots(page, choices.first());
    for (const result of Object.values(states)) expect(result.geometry).toEqual(before[0].geometry);
  });
});
