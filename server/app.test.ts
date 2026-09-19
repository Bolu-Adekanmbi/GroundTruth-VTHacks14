import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "../shared/api-schema.js";
import { getHealthResponse } from "./routes/health.js";

describe("health route", () => {
  it("returns the validated GroundTruth health envelope", () => {
    const response = getHealthResponse();

    expect(healthResponseSchema.parse(response)).toEqual({
      ok: true,
      data: {
        service: "groundtruth-api",
        status: "ready"
      },
      source: "curated",
      warnings: []
    });
  });
});
