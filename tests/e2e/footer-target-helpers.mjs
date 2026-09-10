import { expect } from "@playwright/test";

const REGIONS = ["back", "session-menu", "help"];

export async function expectSeparatedFooterTargets(page) {
  const footer = page.locator("[data-shell-footer]");
  await expect(footer).toBeVisible();
  for (const region of REGIONS) {
    await expect(footer.locator(`[data-footer-region="${region}"]`)).toBeVisible();
  }

  const geometry = await footer.evaluate((footerNode, regions) => {
    const rectOf = (node) => {
      const rect = node.getBoundingClientRect();
      const y = rect.top + rect.height / 2;
      const points = [rect.left + 2, rect.left + rect.width / 2, rect.right - 2]
        .map((x) => ({ x, y }));
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: y,
        ownsHitPoints: points.map(({ x, y: pointY }) => {
          const hit = document.elementFromPoint(x, pointY);
          return hit === node || node.contains(hit);
        })
      };
    };

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      footer: rectOf(footerNode),
      targets: Object.fromEntries(regions.map((region) => [
        region,
        rectOf(footerNode.querySelector(`[data-footer-region="${region}"]`))
      ]))
    };
  }, REGIONS);

  expect(geometry.viewport).toEqual({ width: 390, height: 844 });
  expect(geometry.footer.left).toBeGreaterThanOrEqual(0);
  expect(geometry.footer.right).toBeLessThanOrEqual(geometry.viewport.width);
  expect(geometry.footer.top).toBeGreaterThanOrEqual(0);
  expect(geometry.footer.bottom).toBeLessThanOrEqual(geometry.viewport.height);

  for (const region of REGIONS) {
    const target = geometry.targets[region];
    expect(target.left).toBeGreaterThanOrEqual(geometry.footer.left);
    expect(target.right).toBeLessThanOrEqual(geometry.footer.right);
    expect(target.top).toBeGreaterThanOrEqual(geometry.footer.top);
    expect(target.bottom).toBeLessThanOrEqual(geometry.footer.bottom);
    expect(target.ownsHitPoints).toEqual([true, true, true]);
  }

  const back = geometry.targets.back;
  const menu = geometry.targets["session-menu"];
  const help = geometry.targets.help;
  expect(back.centerX).toBeLessThan(geometry.viewport.width / 3);
  expect(menu.centerX).toBeCloseTo(geometry.viewport.width / 2, 5);
  expect(help.centerX).toBeGreaterThan(geometry.viewport.width * 2 / 3);
  expect(back.right).toBeLessThanOrEqual(menu.left);
  expect(menu.right).toBeLessThanOrEqual(help.left);

  return geometry.targets;
}
