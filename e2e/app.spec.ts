import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { geoJsonExportSchema, metadataExportSchema } from "../src/features/export/export-builders";

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
  await expect(output.getByText("154 m x 57 m")).toBeVisible();

  await page.getByLabel("Curated example").selectOption("willard-building");

  await expect(output.getByText("40.79576, -77.86442")).toBeVisible();
  await expect(output.getByText("91 m x 49 m")).toBeVisible();
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
});

test("edits base traits, records manual state, and resets the selected seed", async ({ page }) => {
  await page.goto("/");

  const floors = page.getByRole("spinbutton", { name: "Floors" });
  const material = page.getByRole("combobox", { name: "Material" });
  await floors.fill("7");
  await material.selectOption("metal");

  await expect(floors).toHaveValue("7");
  await expect(material).toHaveValue("metal");
  await expect(page.getByText("Manually edited").first()).toBeVisible();

  await page.getByRole("radio", { name: "Scorched Nebraska" }).click();
  await page.getByRole("radio", { name: "Base" }).click();
  await expect(floors).toHaveValue("7");

  await page.getByRole("button", { name: "Reset scene edits" }).click();
  await expect(floors).toHaveValue("5");
  await expect(material).toHaveValue("brick");
});

test("renders a nonblank procedural building canvas and supports camera actions", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator(".scene-stage canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveScreenshot("phase-7-burruss-canvas.png");

  await page.getByRole("button", { name: "Fit building" }).click();
  await page.getByRole("button", { name: "Reset view" }).click();
  await page.getByLabel("Curated example").selectOption("willard-building");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveScreenshot("phase-7-willard-canvas.png");
});

test("renders an editable deterministic Scorched Nebraska treatment", async ({ page }) => {
  await page.goto("/");
  const canvas = page.locator(".scene-stage canvas");

  await page.getByRole("radio", { name: "Scorched Nebraska" }).click();
  await expect(page.getByText("Generated scenario attributes")).toBeVisible();
  await expect(page.getByText("Scorched landmark")).toBeVisible();
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveScreenshot("phase-9-scorched-burruss-canvas.png");

  const scorch = page.getByLabel("Scorch intensity");
  await scorch.fill("0.9");
  await expect(scorch).toHaveValue("0.9");
  await expect(page.getByText("Heavy fire damage")).toBeVisible();

  await page.getByRole("radio", { name: "Base" }).click();
  await page.getByRole("radio", { name: "Scorched Nebraska" }).click();
  await expect(scorch).toHaveValue("0.9");
});

test("downloads parseable GeoJSON and metadata for the active Scorched scene", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Scorched Nebraska" }).click();
  await page.getByRole("spinbutton", { name: "Floors" }).fill("7");

  const [geojsonDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download GeoJSON" }).click()
  ]);
  const geojson = geoJsonExportSchema.parse(JSON.parse(await readFile(await geojsonDownload.path(), "utf8")) as unknown);
  expect(geojsonDownload.suggestedFilename()).toBe("groundtruth-burruss-hall-scorched.geojson");
  expect(geojson.type).toBe("FeatureCollection");
  const footprint = geojson.features[0];
  if (!footprint || footprint.geometry.type !== "Polygon") throw new Error("Expected footprint polygon");
  expect(footprint.geometry.coordinates[0]?.[0]?.length).toBe(2);
  expect(geojson.features[0].properties.scene_mode).toBe("scorched");
  expect(geojson.features[0].properties.floors).toBe(7);
  expect(geojson.features.some((feature) => feature.properties.claim === "simulated")).toBe(true);

  const [metadataDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download metadata" }).click()
  ]);
  const metadata = metadataExportSchema.parse(JSON.parse(await readFile(await metadataDownload.path(), "utf8")) as unknown);
  expect(metadataDownload.suggestedFilename()).toBe("groundtruth-burruss-hall-scorched-metadata.json");
  expect("uri" in metadata.scene.evidence[0]).toBe(false);
  expect(metadata.scene.scenario.activeMode).toBe("scorched");
  expect(metadata.export.generated_scenario).toBe(true);
  expect(metadata.export.scenario_provenance.claim).toBe("simulated");
});

test("downloads a nonempty GLB for the active scenario", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Disaster Response" }).click();
  await page.getByRole("combobox", { name: "Damage type" }).selectOption("fire");
  await page.getByLabel("Damage severity").fill("0.7");

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download GLB 3D model" }).click()
  ]);
  const binary = await readFile(await download.path());

  expect(download.suggestedFilename()).toBe("groundtruth-burruss-hall-disaster.glb");
  expect(binary.byteLength).toBeGreaterThan(1_000);
  expect(binary.subarray(0, 4).toString("utf8")).toBe("glTF");
});

test("renders an operational Disaster configuration with a distinct canvas", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Disaster Response" }).click();
  await page.getByRole("combobox", { name: "Damage type" }).selectOption("fire");
  await page.getByLabel("Damage severity").fill("0.7");
  await page.getByRole("combobox", { name: "Access status" }).selectOption("blocked");
  await page.getByLabel("Primary entrance blocked").check();
  await page.getByLabel("Hazard tags").fill("debris field");

  await expect(page.getByLabel("Disaster overlay legend")).toBeVisible();
  await expect(page.getByLabel("Disaster operational conditions")).toBeVisible();
  await expect(page.locator(".scene-stage canvas")).toHaveScreenshot("phase-11-disaster-burruss-canvas.png");
});

test("keeps curated scenes usable offline and guides custom trait confirmation", async ({ page, context }) => {
  await page.goto("/");
  await context.setOffline(true);
  await expect(page.getByText("offline: curated demo available")).toBeVisible();
  await page.getByLabel("Curated example").selectOption("willard-building");
  await expect(page.getByText("Willard Building east view")).toBeVisible();
  await context.setOffline(false);

  await page.getByLabel("Address").fill("55 Demo Lane");
  await page.getByLabel("Photo upload").setInputFiles({ name: "front.jpg", mimeType: "image/jpeg", buffer: Buffer.from("photo") });
  await page.getByRole("button", { name: "Generate scene" }).click();
  await expect(page.getByRole("button", { name: "Confirm custom traits" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm custom traits" }).click();
  await expect(page.getByText("scene-ready")).toBeVisible();
});

test("shows a recoverable map warning when basemap tiles fail", async ({ page }) => {
  await page.route("**tile.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByText("Basemap tiles are unavailable; footprint and GIS state remain visible.")).toBeVisible();
});

test("keeps core controls keyboard operable", async ({ page }) => {
  await page.goto("/");
  const mode = page.getByRole("radio", { name: "Scorched Nebraska" });
  await mode.focus();
  await page.keyboard.press("Space");
  await expect(mode).toBeChecked();

  const download = page.getByRole("button", { name: "Download GeoJSON" });
  await download.focus();
  const [file] = await Promise.all([page.waitForEvent("download"), page.keyboard.press("Enter")]);
  expect(file.suggestedFilename()).toContain("scorched.geojson");
});

const polishViewports = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "laptop-1280x720", width: 1280, height: 720 },
  { name: "tablet-landscape-1024x768", width: 1024, height: 768 },
  { name: "tablet-portrait-768x1024", width: 768, height: 1024 },
  { name: "mobile-390x844", width: 390, height: 844 }
];

for (const viewport of polishViewports) {
  test(`keeps Phase 13 layout within ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");
    if (viewport.width < 768) await page.getByRole("radio", { name: "3D" }).click();
    await expect(page.locator(".scene-stage canvas")).toBeVisible();
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", viewport.width);
  });
}

for (const mode of ["base", "scorched", "disaster"] as const) {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    test(`captures final ${mode} at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");
      if (mode !== "base") await page.getByRole("radio", { name: mode === "scorched" ? "Scorched Nebraska" : "Disaster Response" }).click();
      if (mode === "disaster") {
        await page.getByRole("combobox", { name: "Damage type" }).selectOption("fire");
        await page.getByLabel("Damage severity").fill("0.7");
        await page.getByLabel("Hazard tags").fill("debris field");
      }
      if (viewport.width < 768) await page.getByRole("radio", { name: "3D" }).click();
      await expect(page.locator(".scene-stage canvas")).toBeVisible();
      await page.screenshot({ fullPage: true, path: `test-results/final-${mode}-${viewport.name}.png` });
    });
  }
}

const screenshotViewports = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "laptop-1280x720", width: 1280, height: 720 },
  { name: "mobile-390x844", width: 390, height: 844 }
];

for (const viewport of screenshotViewports) {
  test(`captures Phase 9 screenshot at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "GroundTruth" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Scorched Nebraska" })).toBeVisible();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    await expect(page.locator(".maplibregl-ctrl-attrib")).toBeVisible();
    if (viewport.width < 768) {
      await page.getByRole("radio", { name: "3D" }).click();
    }
    await expect(page.locator(".scene-stage canvas")).toBeVisible();
    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", viewport.width);
    await page.screenshot({
      fullPage: true,
      path: `test-results/phase-8-${viewport.name}.png`
    });
  });
}

for (const viewport of screenshotViewports) {
  test(`captures Phase 11 Disaster mode screenshot at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    // Switch to Disaster mode
    await page.getByRole("radio", { name: "Disaster Response" }).click();

    await expect(page.getByRole("heading", { name: "GroundTruth" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Disaster Response" })).toBeChecked();
    await expect(page.locator(".maplibregl-canvas")).toBeVisible();
    if (viewport.width < 768) {
      await page.getByRole("radio", { name: "3D" }).click();
    }
    await expect(page.locator(".scene-stage canvas")).toBeVisible();

    // Verify disaster scenario panel is visible
    await expect(page.locator(".scenario-panel")).toBeVisible();

    await expect(page.locator("body")).toHaveJSProperty("scrollWidth", viewport.width);
    await page.screenshot({
      fullPage: true,
      path: `test-results/phase-11-${viewport.name}.png`
    });
  });
}
