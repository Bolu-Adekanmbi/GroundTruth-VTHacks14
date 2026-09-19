import { expect, test } from "@playwright/test";

test("loads the GroundTruth workspace shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "GroundTruth" })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Scene mode" })).toBeVisible();
  await expect(page.getByLabel("GIS map with active footprint")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Map and 3D workspace" }).getByText("37.22887, -80.42354")
  ).toBeVisible();
});

test("switches curated samples and updates GIS footprint metadata", async ({ page }) => {
  await page.goto("/");

  const workspace = page.getByRole("region", { name: "Map and 3D workspace" });
  const output = page.getByRole("complementary", { name: "Evidence and output" });

  await expect(workspace.getByText("37.22887, -80.42354")).toBeVisible();
  await expect(page.getByText("curated footprint · 154m x 57m")).toBeVisible();

  await page.getByLabel("Curated example").selectOption("willard-building");

  await expect(output.getByText("40.79576, -77.86442")).toBeVisible();
  await expect(page.getByText("curated footprint · 91m x 49m")).toBeVisible();
});

test("manually corrects footprint geometry and facade orientation", async ({ page }) => {
  await page.goto("/");
  const output = page.getByRole("complementary", { name: "Evidence and output" });

  await page.getByLabel("Footprint width meters").fill("70");
  await page.getByLabel("Footprint depth meters").fill("35");
  await page.getByLabel("Footprint bearing degrees").fill("22");
  await page.getByLabel("Front facade bearing degrees").fill("135");

  await expect(output.getByText("Manual Rectangle")).toBeVisible();
  await expect(output.getByText("22 deg")).toBeVisible();
  await expect(output.getByText("135 deg")).toBeVisible();

  await page.getByRole("button", { name: "Nudge east" }).click();

  await expect(output.getByText("Manual Corrected")).toBeVisible();
  await expect(page.getByText(/manual-corrected footprint/)).toBeVisible();
});

const screenshotViewports = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "laptop-1280x720", width: 1280, height: 720 },
  { name: "mobile-390x844", width: 390, height: 844 }
];

for (const viewport of screenshotViewports) {
  test(`captures Phase 6 screenshot at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "GroundTruth" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Scorched Nebraska" })).toBeVisible();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await expect(page.locator(".maplibregl-ctrl-attrib")).toBeVisible();
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", viewport.width);
    await page.screenshot({
      fullPage: true,
      path: `test-results/phase-6-${viewport.name}.png`
    });
  });
}
