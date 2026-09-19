import { Router } from "express";
import {
  apiFailureSchema,
  extractTraitsRequestSchema,
  extractTraitsResponseSchema
} from "../../shared/api-schema.js";
import { getDemoSceneById } from "../../shared/demo-scenes.js";

const customDefaults = {
  buildingType: "warehouse",
  floors: 1,
  heightM: 6,
  material: "concrete",
  roofType: "flat",
  windowPattern: "sparse",
  entrancePosition: "unknown"
} as const;

export function getExtractTraitsResponse(input: unknown) {
  const parsed = extractTraitsRequestSchema.safeParse(input);

  if (!parsed.success) {
    return apiFailureSchema.parse({
      ok: false,
      error: {
        code: "INVALID_EXTRACT_TRAITS_REQUEST",
        message: "Provide a curated scene id or mark this as custom evidence.",
        retryable: false
      }
    });
  }

  if (parsed.data.custom) {
    return extractTraitsResponseSchema.parse({
      ok: true,
      data: { traits: customDefaults, confidence: 0.25, status: "review-required" },
      source: "fallback",
      warnings: [
        "No vision model is active. Conservative defaults require manual review.",
        "Rear facade not represented in evidence."
      ]
    });
  }

  const scene = parsed.data.sceneId ? getDemoSceneById(parsed.data.sceneId) : undefined;
  if (!scene) {
    return apiFailureSchema.parse({
      ok: false,
      error: {
        code: "CURATED_SCENE_NOT_FOUND",
        message: "No curated scene is available for seeded trait extraction.",
        retryable: false
      }
    });
  }

  return extractTraitsResponseSchema.parse({
    ok: true,
    data: { traits: scene.building, confidence: scene.confidence.traits, status: "seeded" },
    source: "curated",
    warnings: ["Rear facade not represented in evidence."]
  });
}

export const traitsRouter = Router();

traitsRouter.post("/extract-traits", (request, response) => {
  const payload = getExtractTraitsResponse(request.body);
  response.status(payload.ok ? 200 : 400).json(payload);
});
