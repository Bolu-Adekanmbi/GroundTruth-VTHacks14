import { z } from "zod";
import { polygonFeatureSchema, sceneProjectSchema } from "./scene-schema.js";

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
  confidence: z.number().min(0).max(1)
});

export const footprintResponseSchema = z.object({
  ok: z.literal(true),
  data: footprintResultSchema,
  source: apiSourceSchema,
  warnings: z.array(z.string())
});

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
