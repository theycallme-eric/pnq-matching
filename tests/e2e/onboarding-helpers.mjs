export async function reachDashboardFromSplash(page) {
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("checkbox", { name: /research prototype/i }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Confirm fictional profile" }).click();
}

export async function startSessionFromSplash(page) {
  await reachDashboardFromSplash(page);
  await page.getByRole("button", { name: "New Session" }).click();
}
