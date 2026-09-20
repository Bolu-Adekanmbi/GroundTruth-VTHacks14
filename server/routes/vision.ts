import { Router } from "express";
import {
  apiFailureSchema,
  visionSuggestRequestSchema,
  visionSuggestResponseSchema
} from "../../shared/api-schema.js";

export const visionRouter = Router();

export function getMockVisionSuggestion() {
  return visionSuggestResponseSchema.parse({
    ok: true,
    data: {
      traits: {
        buildingType: "institutional",
        floors: 3,
        heightM: 10,
        material: "brick",
        roofType: "flat",
        windowPattern: "regular",
        entrancePosition: "unknown"
      },
      dominantFacadeColor: "#9a5b45",
      dominantFacadeColorLabel: "warm red brick",
      accentColor: "#d2c5ad",
      floorsRange: { min: 2, max: 3 },
      estimatedWindowColumns: 8,
      estimatedWindowsPerFloor: 8,
      facadeModules: [
        { type: "canopy", confidence: 0.66, note: "A shallow entrance canopy is visible in the supplied facade." }
      ],
      fieldConfidence: { color: 0.82, windows: 0.68, floors: 0.71, roof: 0.76 },
      confidence: 0.7,
      assumptions: [
        "Visible-facade estimate only; rear and side facades are not inferred.",
        "Color can vary with lighting and image white balance."
      ],
      warnings: ["Review every suggestion before applying it to the procedural model."]
    },
    source: "fallback"
  });
}

visionRouter.post("/suggest", async (request, response) => {
  const parsed = visionSuggestRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json(apiFailureSchema.parse({
      ok: false,
      error: { code: "INVALID_VISION_REQUEST", message: "Provide one to three JPEG, PNG, or WebP photos.", retryable: false }
    }));
  }
  const endpoint = process.env.VISION_ADAPTER_URL;
  if (endpoint === "mock") return response.json(getMockVisionSuggestion());
  if (!endpoint) {
    return response.status(503).json(apiFailureSchema.parse({
      ok: false,
      error: { code: "VISION_UNAVAILABLE", message: "Vision suggestions are unavailable; use editable defaults.", retryable: true }
    }));
  }
  try {
    const result = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(8_000)
    });
    if (!result.ok) throw new Error(`Adapter returned ${result.status}`);
    const payload = visionSuggestResponseSchema.parse(await result.json());
    return response.json(payload);
  } catch {
    return response.status(503).json(apiFailureSchema.parse({
      ok: false,
      error: { code: "VISION_UNAVAILABLE", message: "Vision adapter is unavailable or returned invalid suggestions; use editable defaults.", retryable: true }
    }));
  }
});
