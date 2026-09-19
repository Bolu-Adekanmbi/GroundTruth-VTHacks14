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

  it("exports Disaster Response with simulated status", () => {
    const project = getDemoSceneById("burruss-hall")!;
    const disaster = {
      ...project,
      scenario: {
        ...project.scenario,
        activeMode: "disaster" as const,
        disaster: {
          status: "simulated" as const,
          damageType: "fire" as const,
          severity: 0.6,
          accessStatus: "blocked" as const,
          hazards: ["debris field"],
          responderNote: "Simulated fire damage scenario for demo"
        }
      }
    };
    const geojson = buildGeoJsonExport(disaster);
    const metadata = buildMetadataExport(disaster, generatedAt);

    expect(geojson.features.some((f) => f.properties.scenario_kind === "disaster-response")).toBe(true);
    expect(geojson.features.some((f) => f.properties.feature_kind === "damage_assessment" && f.properties.status === "simulated")).toBe(true);
    expect(geojson.features.some((f) => f.properties.feature_kind === "access_status" && f.properties.access_status === "blocked")).toBe(true);
    expect(metadata.export.scenario_provenance.label).toContain("simulated");
  });

  it("exports Disaster Response with observed status", () => {
    const project = getDemoSceneById("willard-building")!;
    const disaster = {
      ...project,
      scenario: {
        ...project.scenario,
        activeMode: "disaster" as const,
        disaster: {
          status: "observed" as const,
          damageType: "wind" as const,
          severity: 0.3,
          accessStatus: "limited" as const,
          hazards: ["partial roof damage"],
          responderNote: "Observed wind damage to north facade; requires verification"
        }
      }
    };
    const geojson = buildGeoJsonExport(disaster);
    const metadata = buildMetadataExport(disaster, generatedAt);

    expect(geojson.features.some((f) => f.properties.feature_kind === "damage_assessment" && f.properties.status === "observed")).toBe(true);
    expect(metadata.export.scenario_provenance.claim).toBe("observed");
  });

  it.each(["inferred", "unknown"] as const)("preserves %s Disaster provenance", (status) => {
    const project = getDemoSceneById("burruss-hall")!;
    const disaster = {
      ...project,
      scenario: {
        ...project.scenario,
        activeMode: "disaster" as const,
        disaster: { ...project.scenario.disaster, status }
      }
    };

    expect(buildMetadataExport(disaster, generatedAt).export.scenario_provenance.claim).toBe(status);
  });

  it("custom scene defaults to unknown disaster status", () => {
    const baseBurruss = getDemoSceneById("burruss-hall")!;
    const customProject: typeof baseBurruss = {
      ...baseBurruss,
      id: "custom-session",
      scenario: {
        ...baseBurruss.scenario,
        disaster: {
          status: "unknown" as const,
          damageType: "none" as const,
          severity: 0,
          accessStatus: "unknown" as const,
          hazards: [],
          responderNote: "User-provided normal photos; no observed damage claim."
        }
      }
    };
    const metadata = buildMetadataExport(customProject, generatedAt);
    expect(metadata.scene.scenario.disaster.status).toBe("unknown");
  });

  it("includes hazard zone and access features only when relevant", () => {
    const project = getDemoSceneById("burruss-hall")!;

    // No hazards, minimal accessStatus
    const minimal = {
      ...project,
      scenario: {
        ...project.scenario,
        activeMode: "disaster" as const,
        disaster: {
          status: "simulated" as const,
          damageType: "none" as const,
          severity: 0,
          accessStatus: "unknown" as const,
          hazards: [],
          responderNote: ""
        }
      }
    };
    const minimalGeo = buildGeoJsonExport(minimal);
    const minimalDisasterFeatures = minimalGeo.features.filter((f) => f.properties.scenario_kind === "disaster-response");
    // Should include footprint + entrance (trait-derived), but no damage/hazard/access features
    expect(minimalDisasterFeatures.length).toBe(2);

    // With hazards, blocked access, and damage
    const full = {
      ...project,
      scenario: {
        ...project.scenario,
        activeMode: "disaster" as const,
        disaster: {
          status: "simulated" as const,
          damageType: "structural" as const,
          severity: 0.8,
          accessStatus: "blocked" as const,
          hazards: ["structural compromise", "debris"],
          responderNote: "Test scenario"
        }
      }
    };
    const fullGeo = buildGeoJsonExport(full);
    const fullDisasterFeatures = fullGeo.features.filter((f) => f.properties.scenario_kind === "disaster-response");
    // Should include footprint + entrance + hazard_zone + access_status + damage_assessment
    expect(fullDisasterFeatures.length).toBeGreaterThan(minimalDisasterFeatures.length);
  });
});
