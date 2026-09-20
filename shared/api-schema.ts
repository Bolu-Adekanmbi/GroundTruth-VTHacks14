import { z } from "zod";
import { buildingTraitsSchema, facadeModuleTypeSchema, polygonFeatureSchema, sceneProjectSchema } from "./scene-schema.js";

export const apiSourceSchema = z.enum(["curated", "live", "fallback"]);

export const apiFailureSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean()
  })
});

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    service: z.literal("groundtruth-api"),
    status: z.literal("ready")
  }),
  source: apiSourceSchema,
  warnings: z.array(z.string())
});

export const demoSceneSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  thumbnailUri: z.string(),
  updatedAt: z.string()
});

export const demoScenesResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(demoSceneSummarySchema),
  source: apiSourceSchema,
  warnings: z.array(z.string())
});

export const demoSceneResponseSchema = z.object({
  ok: z.literal(true),
  data: sceneProjectSchema,
  source: apiSourceSchema,
  warnings: z.array(z.string())
});

export const geocodeRequestSchema = z.object({
  address: z.string().min(1)
});

export const geocodeResultSchema = z.object({
  address: z.string().min(1),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  source: z.enum(["curated", "geocoder", "manual"]),
  confidence: z.number().min(0).max(1)
});

export const geocodeResponseSchema = z.object({
  ok: z.literal(true),
  data: geocodeResultSchema,
  source: apiSourceSchema,
  warnings: z.array(z.string())
});

export const footprintRequestSchema = z.object({
  sceneId: z.string().optional(),
  address: z.string().optional(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  widthM: z.number().positive().default(30),
  depthM: z.number().positive().default(20),
  bearingDeg: z.number().min(0).lt(360).default(0)
});

export const footprintResultSchema = z.object({
  feature: polygonFeatureSchema,
  source: z.enum(["curated", "osm", "manual-rectangle"]),
  widthM: z.number().positive(),
  depthM: z.number().positive(),
  bearingDeg: z.number().min(0).lt(360),
  confidence: z.number().min(0).max(1),
  heightEnrichment: z.object({
    heightM: z.number().positive(),
    floors: z.number().int().positive().optional(),
    source: z.enum(["osm-height", "osm-levels"]),
    confidence: z.number().min(0).max(1),
    assumption: z.string().min(1)
  }).optional()
});

export const footprintResponseSchema = z.object({
  ok: z.literal(true),
  data: footprintResultSchema,
  source: apiSourceSchema,
  warnings: z.array(z.string())
});

export const extractTraitsRequestSchema = z.object({
  sceneId: z.string().min(1).optional(),
  custom: z.boolean().default(false)
});

export const extractTraitsResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    traits: buildingTraitsSchema,
    confidence: z.number().min(0).max(1),
    status: z.enum(["seeded", "review-required"])
  }),
  source: apiSourceSchema,
  warnings: z.array(z.string())
});

export const visionSuggestionSchema = z.object({
  traits: buildingTraitsSchema,
  dominantFacadeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  dominantFacadeColorLabel: z.string().min(1),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  floorsRange: z.object({ min: z.number().int().positive(), max: z.number().int().positive() }),
  estimatedWindowColumns: z.number().int().min(1).max(40),
  estimatedWindowsPerFloor: z.number().int().min(1).max(40),
  facadeModules: z.array(z.object({
    type: facadeModuleTypeSchema,
    confidence: z.number().min(0).max(1),
    note: z.string().min(1)
  })).max(3).default([]),
  visibleFacadeBearing: z.number().min(0).lt(360).optional(),
  fieldConfidence: z.object({
    color: z.number().min(0).max(1),
    windows: z.number().min(0).max(1),
    floors: z.number().min(0).max(1),
    roof: z.number().min(0).max(1)
  }),
  confidence: z.number().min(0).max(1),
  assumptions: z.array(z.string()).min(1),
  warnings: z.array(z.string())
});

const visionImageSchema = z.object({
  dataUrl: z.string().regex(/^data:image\/(jpeg|png|webp);base64,/).max(2_000_000)
});

export const visionSuggestRequestSchema = z.object({ images: z.array(visionImageSchema).min(1).max(3) });
export const visionSuggestResponseSchema = z.object({ ok: z.literal(true), data: visionSuggestionSchema, source: apiSourceSchema });

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ApiFailure = z.infer<typeof apiFailureSchema>;
export type DemoSceneSummary = z.infer<typeof demoSceneSummarySchema>;
export type DemoScenesResponse = z.infer<typeof demoScenesResponseSchema>;
export type DemoSceneResponse = z.infer<typeof demoSceneResponseSchema>;
export type GeocodeRequest = z.infer<typeof geocodeRequestSchema>;
export type GeocodeResponse = z.infer<typeof geocodeResponseSchema>;
export type GeocodeResult = z.infer<typeof geocodeResultSchema>;
export type FootprintRequest = z.infer<typeof footprintRequestSchema>;
export type FootprintResponse = z.infer<typeof footprintResponseSchema>;
export type FootprintResult = z.infer<typeof footprintResultSchema>;
export type ExtractTraitsRequest = z.infer<typeof extractTraitsRequestSchema>;
export type ExtractTraitsResponse = z.infer<typeof extractTraitsResponseSchema>;
export type VisionSuggestion = z.infer<typeof visionSuggestionSchema>;
export type VisionSuggestResponse = z.infer<typeof visionSuggestResponseSchema>;
