import { expect } from "@playwright/test";

export async function openContextualHelp(page) {
  await page.locator("[data-shell-footer]").getByRole("button", { name: "Help", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Help" });
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function chooseHelpAction(page, name) {
  const dialog = await openContextualHelp(page);
  await dialog.locator("[data-help-actions]").getByRole("button", { name, exact: true }).click();
  await expect(dialog).toHaveCount(0);
}
