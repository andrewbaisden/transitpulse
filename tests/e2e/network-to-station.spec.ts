import { expect, test } from "@playwright/test";

test("network overview -> line -> station journey", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Live Network" })).toBeVisible();
  await expect(page.getByTestId("line-card").first()).toBeVisible();

  await page.getByTestId("line-card").filter({ hasText: "Central" }).click();
  await expect(page.getByRole("heading", { name: "Central" })).toBeVisible();
  await expect(page.getByText(/Stations \(\d+\)/)).toBeVisible();

  await page.getByRole("link", { name: "Stratford" }).click();
  await expect(page.getByRole("heading", { name: "Stratford" })).toBeVisible();
  // getByText("Lines") is ambiguous here — it also matches the header nav
  // link and the search box's "Search lines and stations" hidden dialog
  // description. The station page's "Lines" section is a heading, so
  // scope to that role specifically.
  await expect(page.getByRole("heading", { name: "Lines" })).toBeVisible();
});
