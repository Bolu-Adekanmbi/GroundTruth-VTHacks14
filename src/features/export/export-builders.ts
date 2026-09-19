import { z } from "zod";
import { getProjectCentroid, moveCoordinateMeters, type LngLat } from "../../../shared/geo";
import { sceneProjectSchema, type SceneProject } from "../../../shared/scene-schema";

const APP_VERSION = "0.1.0";

const geoJsonPositionSchema = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);
const geoJsonFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: z.discriminatedUnion("type", [
    z.object({ type: z.literal("Polygon"), coordinates: z.array(z.array(geoJsonPositionSchema)).min(1) }),
    z.object({ type: z.literal("Point"), coordinates: geoJsonPositionSchema })
  ]),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export const geoJsonExportSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(geoJsonFeatureSchema).min(1)
});

const exportedEvidenceSchema = sceneProjectSchema.shape.evidence.element.omit({ uri: true });
export const metadataExportSchema = z.object({
  schema_version: z.literal(1),
  app_version: z.string(),
  generated_at: z.string().datetime(),
  scene: sceneProjectSchema.extend({ evidence: z.array(exportedEvidenceSchema).min(1) }),
  export: z.object({
    active_mode: z.string(),
    base_facts: z.object({
      location: z.string(),
      footprint_source: z.string(),
      building_type: z.string()
    }),
    generated_scenario: z.boolean(),
    scenario_provenance: z.object({
      kind: z.enum(["base-facts", "generated-scenario"]),
      claim: z.enum(["not-applicable", "simulated"]),
      label: z.string()
    })
  })
});

export type GeoJsonExport = z.infer<typeof geoJsonExportSchema>;
export type MetadataExport = z.infer<typeof metadataExportSchema>;

export function buildGeoJsonExport(project: SceneProject): GeoJsonExport {
  const mode = project.scenario.activeMode;
  const features: GeoJsonExport["features"] = [
    {
      type: "Feature",
      geometry: project.footprint.feature.geometry,
      properties: {
        scene_id: project.id,
        scene_mode: mode,
        address: project.location.address,
        building_type: project.building.buildingType,
        floors: project.building.floors,
        height_m: project.building.heightM,
        material: project.building.material,
        roof_type: project.building.roofType,
        footprint_source: project.footprint.source,
        confidence: project.confidence.overall,
        access_status: project.scenario.disaster.accessStatus,
        damage_type: project.scenario.disaster.damageType,
        scenario_kind: getScenarioKind(mode)
      }
    }
  ];

  const entrance = getEntrancePoint(project);
  if (entrance) {
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: entrance },
      properties: {
        scene_id: project.id,
        scene_mode: mode,
        feature_kind: "entrance_access",
        access_source: "trait-derived",
        entrance_position: project.building.entrancePosition,
        scenario_kind: getScenarioKind(mode)
      }
    });
  }

  if (mode === "scorched" && project.scenario.scorched.debrisDensity > 0) {
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: getProjectCentroid(project) },
      properties: {
        scene_id: project.id,
        scene_mode: mode,
        feature_kind: "generated_debris_area",
        claim: "simulated",
        debris_density: project.scenario.scorched.debrisDensity,
        scenario_kind: "generated-scorched-nebraska"
      }
    });
  }

  return geoJsonExportSchema.parse({ type: "FeatureCollection", features });
}

export function buildMetadataExport(project: SceneProject, generatedAt = new Date().toISOString()): MetadataExport {
  const scene = {
    ...project,
    evidence: project.evidence.map((evidence) => ({
      id: evidence.id,
      origin: evidence.origin,
      claim: evidence.claim,
      title: evidence.title,
      alt: evidence.alt,
      capturedAt: evidence.capturedAt,
      attribution: evidence.attribution
    }))
  };

  return metadataExportSchema.parse({
    schema_version: 1,
    app_version: APP_VERSION,
    generated_at: generatedAt,
    scene,
    export: {
      active_mode: project.scenario.activeMode,
      base_facts: {
        location: project.location.address,
        footprint_source: project.footprint.source,
        building_type: project.building.buildingType
      },
      generated_scenario: project.scenario.activeMode !== "base",
      scenario_provenance: project.scenario.activeMode === "base"
        ? { kind: "base-facts", claim: "not-applicable", label: "Base building facts and evidence record" }
        : { kind: "generated-scenario", claim: "simulated", label: "Generated scenario treatment; not source-photo evidence" }
    }
  });
}

export function getExportFilename(project: SceneProject, format: "geojson" | "metadata") {
  const sceneSlug = slugify(project.name || project.id);
  const suffix = format === "metadata" ? "-metadata.json" : ".geojson";
  return `groundtruth-${sceneSlug}-${project.scenario.activeMode}${suffix}`;
}

export function downloadJson(filename: string, value: unknown) {
  const body = JSON.stringify(value, null, 2);
  const blob = new Blob([body], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getScenarioKind(mode: SceneProject["scenario"]["activeMode"]) {
  return mode === "scorched" ? "generated-scorched-nebraska" : mode === "disaster" ? "disaster-response" : "base";
}

function getEntrancePoint(project: SceneProject): LngLat | null {
  const bearingByPosition: Partial<Record<SceneProject["building"]["entrancePosition"], number>> = {
    north: 0,
    east: 90,
    south: 180,
    west: 270
  };
  const bearing = bearingByPosition[project.building.entrancePosition] ?? project.footprint.facadeOrientation?.frontBearingDeg;
  if (bearing === undefined || project.building.entrancePosition === "unknown") return null;

  const radians = bearing * Math.PI / 180;
  return moveCoordinateMeters(getProjectCentroid(project), Math.sin(radians) * 8, Math.cos(radians) * 8);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "scene";
}
