import { expect, test } from "@playwright/test";

test("loads the GroundTruth placeholder", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "GroundTruth" })).toBeVisible();
  await expect(page.getByText(/runtime foundation is ready/i)).toBeVisible();
});
