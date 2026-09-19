import { describe, expect, it } from "vitest";
import { getDemoSceneById } from "../../../shared/demo-scenes";
import {
  buildGeoJsonExport,
  buildMetadataExport,
  geoJsonExportSchema,
  getExportFilename,
  metadataExportSchema
} from "./export-builders";

const generatedAt = "2026-09-19T12:00:00.000Z";

describe("export builders", () => {
  it.each(["burruss-hall", "willard-building"])("builds valid Base fixtures for %s", (id) => {
    const project = getDemoSceneById(id)!;
    const geojson = buildGeoJsonExport(project);
    const metadata = buildMetadataExport(project, generatedAt);

    expect(geoJsonExportSchema.parse(geojson).features[0].geometry.type).toBe("Polygon");
    expect(geojson.features[0].properties.scene_mode).toBe("base");
    expect(metadataExportSchema.parse(metadata).scene.evidence[0]).not.toHaveProperty("uri");
    expect(metadata.export.generated_scenario).toBe(false);
    expect(metadata.export.scenario_provenance.claim).toBe("not-applicable");
    expect(getExportFilename(project, "geojson")).toBe(`groundtruth-${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-base.geojson`);
  });

  it.each(["burruss-hall", "willard-building"])("exports Scorched attributes as generated for %s", (id) => {
    const project = getDemoSceneById(id)!;
    const scorched = { ...project, scenario: { ...project.scenario, activeMode: "scorched" as const } };
    const geojson = buildGeoJsonExport(scorched);
    const metadata = buildMetadataExport(scorched, generatedAt);

    expect(geojson.features.some((feature) => feature.properties.feature_kind === "generated_debris_area" && feature.properties.claim === "simulated")).toBe(true);
    expect(metadata.export.generated_scenario).toBe(true);
    expect(metadata.scene.scenario.activeMode).toBe("scorched");
    expect(metadata.export.scenario_provenance.claim).toBe("simulated");
  });
});
