import { describe, expect, it } from "vitest";
import {
  apiFailureSchema,
  demoSceneResponseSchema,
  demoScenesResponseSchema
} from "../../shared/api-schema.js";
import { getDemoSceneResponse, getDemoScenesResponse } from "./demo-scenes.js";

describe("demo scene route payloads", () => {
  it("returns validated curated scene summaries", () => {
    const response = getDemoScenesResponse();

    expect(() => demoScenesResponseSchema.parse(response)).not.toThrow();
    expect(response.ok).toBe(true);
    expect(response.data).toHaveLength(2);
    expect(response.data[0].thumbnailUri).toMatch(/^\/demo-assets\//);
  });

  it("returns a validated scene by id", () => {
    const response = getDemoSceneResponse("burruss-hall");

    expect(() => demoSceneResponseSchema.parse(response)).not.toThrow();
    expect(response.ok).toBe(true);
    if (response.ok) {
      expect(response.data.name).toBe("Burruss Hall");
      expect(response.data.evidence[0].attribution.license).toBe("CC BY-SA 2.0");
    }
  });

  it("returns a structured failure for unknown scene ids", () => {
    const response = getDemoSceneResponse("missing-scene");

    expect(() => apiFailureSchema.parse(response)).not.toThrow();
    expect(response.ok).toBe(false);
    if (!response.ok) {
      expect(response.error.code).toBe("DEMO_SCENE_NOT_FOUND");
      expect(response.error.retryable).toBe(false);
    }
  });
});
