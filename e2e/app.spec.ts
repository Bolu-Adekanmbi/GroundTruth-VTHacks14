import { expect, test } from "@playwright/test";

test("loads the GroundTruth workspace shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "GroundTruth" })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Scene mode" })).toBeVisible();
  await expect(page.getByText("Map initializes in Phase 5")).toBeVisible();
});

const screenshotViewports = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "laptop-1280x720", width: 1280, height: 720 },
  { name: "mobile-390x844", width: 390, height: 844 }
];

for (const viewport of screenshotViewports) {
  test(`captures Phase 2 screenshot at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "GroundTruth" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Scorched Nebraska" })).toBeVisible();
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", viewport.width);
    await page.screenshot({
      fullPage: true,
      path: `test-results/phase-2-${viewport.name}.png`
    });
  });
}
