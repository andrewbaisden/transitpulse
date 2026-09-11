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
  await expect(page.getByText("Lines")).toBeVisible();
});
