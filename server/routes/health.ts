import type { HealthResponse } from "../../shared/api-schema.js";
import { healthResponseSchema } from "../../shared/api-schema.js";

export function getHealthResponse(): HealthResponse {
  return healthResponseSchema.parse({
    ok: true,
    data: {
      service: "groundtruth-api",
      status: "ready"
    },
    source: "curated",
    warnings: []
  });
}
