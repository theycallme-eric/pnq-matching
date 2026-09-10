export async function reachDashboardFromSplash(page) {
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Yes, that's me" }).click();
}

export async function startSessionFromSplash(page) {
  await reachDashboardFromSplash(page);
  await page.getByRole("button", { name: "New Session" }).click();
}

export async function startMatchingOption(page, option) {
  const label = typeof option === "number" ? `Option ${option}` : option;
  await page.getByRole("button", { name: label, exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
}
