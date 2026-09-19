import { z } from "zod";
import { sceneProjectSchema } from "./scene-schema.js";

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

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ApiFailure = z.infer<typeof apiFailureSchema>;
export type DemoSceneSummary = z.infer<typeof demoSceneSummarySchema>;
export type DemoScenesResponse = z.infer<typeof demoScenesResponseSchema>;
export type DemoSceneResponse = z.infer<typeof demoSceneResponseSchema>;
