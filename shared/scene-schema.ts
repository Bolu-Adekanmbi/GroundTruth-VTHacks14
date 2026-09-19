import { z } from "zod";

export const evidenceOriginSchema = z.enum(["curated", "user-upload"]);
export const evidenceClaimSchema = z.enum([
  "observed",
  "inferred",
  "assumed",
  "simulated",
  "unknown"
]);
export const sceneModeSchema = z.enum(["base", "scorched", "disaster"]);

const longitudeSchema = z.number().min(-180).max(180);
const latitudeSchema = z.number().min(-90).max(90);
const coordinateSchema = z.tuple([longitudeSchema, latitudeSchema]);

const linearRingSchema = z
  .array(coordinateSchema)
  .min(4)
  .superRefine((coordinates, context) => {
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];

    if (!first || !last || first[0] !== last[0] || first[1] !== last[1]) {
      context.addIssue({
        code: "custom",
        message: "Polygon rings must be closed with identical first and last coordinates"
      });
    }
  });

export const polygonGeometrySchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(linearRingSchema).min(1)
});

export const polygonFeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: polygonGeometrySchema,
  properties: z.record(z.string(), z.unknown())
});

export const evidenceAttributionSchema = z.object({
  creator: z.string().min(1),
  sourcePageUrl: z.string().url(),
  license: z.string().min(1),
  licenseUrl: z.string().url(),
  retrievedAt: z.string().date(),
  changes: z.string().min(1)
});

export const evidencePhotoSchema = z.object({
  id: z.string().min(1),
  origin: evidenceOriginSchema,
  claim: evidenceClaimSchema,
  title: z.string().min(1),
  uri: z.string().min(1),
  alt: z.string().min(1),
  capturedAt: z.string().optional(),
  attribution: evidenceAttributionSchema
});

export const buildingTraitsSchema = z.object({
  buildingType: z.enum(["institutional", "academic", "warehouse", "office", "mixed-use"]),
  floors: z.number().int().positive(),
  heightM: z.number().positive(),
  material: z.enum(["brick", "concrete", "glass", "siding", "metal"]),
  roofType: z.enum(["flat", "gable", "hip"]),
  windowPattern: z.enum(["regular", "vertical-bands", "mixed", "sparse"]),
  entrancePosition: z.enum(["north", "south", "east", "west", "corner", "unknown"])
});

const confidenceValueSchema = z.number().min(0).max(1);

export const confidenceRecordSchema = z.object({
  overall: confidenceValueSchema,
  location: confidenceValueSchema,
  footprint: confidenceValueSchema,
  traits: confidenceValueSchema
});

export const assumptionSchema = z.object({
  id: z.string().min(1),
  claim: z.string().min(1),
  affectedPath: z.string().min(1),
  evidenceClaim: evidenceClaimSchema,
  rationale: z.string().min(1)
});

export const provenanceRecordSchema = z.object({
  id: z.string().min(1),
  target: z.string().min(1),
  source: z.enum(["curated", "photo-attribution", "manual", "rule", "geocoder", "osm"]),
  claim: evidenceClaimSchema,
  label: z.string().min(1),
  evidenceIds: z.array(z.string())
});

export const scorchedSettingsSchema = z.object({
  decayIntensity: confidenceValueSchema,
  scorchIntensity: confidenceValueSchema,
  overgrowthIntensity: confidenceValueSchema,
  boardedWindowRatio: confidenceValueSchema,
  debrisDensity: confidenceValueSchema,
  gameplayTags: z.array(z.string())
});

export const disasterSettingsSchema = z.object({
  status: z.enum(["simulated", "observed", "inferred", "unknown"]),
  damageType: z.enum(["none", "fire", "flood", "wind", "structural"]),
  severity: confidenceValueSchema,
  accessStatus: z.enum(["open", "limited", "blocked", "unknown"]),
  hazards: z.array(z.string()),
  responderNote: z.string()
});

export const sceneProjectSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  updatedAt: z.string().datetime(),
  location: z.object({
    address: z.string().min(1),
    longitude: longitudeSchema,
    latitude: latitudeSchema,
    source: z.enum(["curated", "geocoder", "manual"])
  }),
  footprint: z.object({
    feature: polygonFeatureSchema,
    source: z.enum(["curated", "osm", "manual-rectangle", "manual-corrected"]),
    widthM: z.number().positive(),
    depthM: z.number().positive(),
    bearingDeg: z.number().min(0).lt(360),
    facadeOrientation: z
      .object({
        frontBearingDeg: z.number().min(0).lt(360).optional(),
        viewpointBearingDeg: z.number().min(0).lt(360).optional(),
        note: z.string().min(1).optional()
      })
      .optional()
  }),
  evidence: z.array(evidencePhotoSchema).min(1),
  building: buildingTraitsSchema,
  scenario: z.object({
    activeMode: sceneModeSchema,
    scorched: scorchedSettingsSchema,
    disaster: disasterSettingsSchema
  }),
  confidence: confidenceRecordSchema,
  assumptions: z.array(assumptionSchema),
  provenance: z.array(provenanceRecordSchema)
});

export type EvidenceOrigin = z.infer<typeof evidenceOriginSchema>;
export type EvidenceClaim = z.infer<typeof evidenceClaimSchema>;
export type SceneMode = z.infer<typeof sceneModeSchema>;
export type SceneProject = z.infer<typeof sceneProjectSchema>;
export type EvidencePhoto = z.infer<typeof evidencePhotoSchema>;
export type BuildingTraits = z.infer<typeof buildingTraitsSchema>;
