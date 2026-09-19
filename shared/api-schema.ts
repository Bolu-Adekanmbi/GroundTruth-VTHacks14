import { z } from "zod";

export const apiSourceSchema = z.enum(["curated", "live", "fallback"]);

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    service: z.literal("groundtruth-api"),
    status: z.literal("ready")
  }),
  source: apiSourceSchema,
  warnings: z.array(z.string())
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
