import { expect } from "@playwright/test";

export async function primaryActionTop(page, name) {
  const region = page.locator("[data-primary-action-region]");
  const footer = page.locator("[data-shell-footer]");
  const action = region.getByRole("button", { name, exact: true });

  await expect(region).toHaveCount(1);
  await expect(region).toBeVisible();
  await expect(region).toHaveCSS("height", "121px");
  await expect(action).toBeVisible();
  await expect(footer).toBeVisible();

  const [regionBox, actionBox, footerBox] = await Promise.all([
    region.boundingBox(),
    action.boundingBox(),
    footer.boundingBox()
  ]);

  expect(regionBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(actionBox.y).toBeGreaterThanOrEqual(regionBox.y - 0.5);
  expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(regionBox.y + regionBox.height + 0.5);
  expect(regionBox.y + regionBox.height).toBeLessThanOrEqual(footerBox.y + 0.5);
  expect(actionBox.y + actionBox.height).toBeLessThanOrEqual(page.viewportSize().height);

  return Math.round(actionBox.y * 10) / 10;
}
