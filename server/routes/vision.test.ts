import { describe, expect, it } from "vitest";
import { visionSuggestResponseSchema } from "../../shared/api-schema.js";
import { getMockVisionSuggestion } from "./vision.js";

describe("vision adapter fallback", () => {
  it("provides a validated, visible-facade-only mock suggestion", () => {
    const parsed = visionSuggestResponseSchema.parse(getMockVisionSuggestion());

    expect(parsed.data.dominantFacadeColor).toBe("#9a5b45");
    expect(parsed.data.assumptions.join(" ")).toMatch(/Visible-facade estimate only/);
    expect(parsed.data.estimatedWindowColumns).toBeGreaterThan(0);
  });
});
