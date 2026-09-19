import { describe, expect, it } from "vitest";
import { extractTraitsResponseSchema } from "../../shared/api-schema.js";
import { getExtractTraitsResponse } from "./traits.js";

describe("trait extraction route payloads", () => {
  it("returns seeded curated traits without claiming model extraction", () => {
    const response = getExtractTraitsResponse({ sceneId: "burruss-hall" });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(extractTraitsResponseSchema.parse(response).data.status).toBe("seeded");
      expect(response.data.traits.material).toBe("brick");
      expect(response.warnings).toContain("Rear facade not represented in evidence.");
    }
  });

  it("returns conservative defaults for custom evidence", () => {
    const response = getExtractTraitsResponse({ custom: true });

    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.status).toBe("review-required");
      expect(response.data.confidence).toBeLessThan(0.3);
    }
  });
});
