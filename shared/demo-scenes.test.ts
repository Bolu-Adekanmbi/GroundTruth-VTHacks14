import { describe, expect, it } from "vitest";
import { demoScenes } from "./demo-scenes.js";
import { sceneProjectSchema } from "./scene-schema.js";

describe("demo scene fixtures", () => {
  it("all curated scenes satisfy the canonical scene schema", () => {
    expect(demoScenes.length).toBeGreaterThanOrEqual(2);

    for (const scene of demoScenes) {
      expect(() => sceneProjectSchema.parse(scene)).not.toThrow();
      expect(scene.footprint.feature.geometry.coordinates[0][0]).toEqual(
        scene.footprint.feature.geometry.coordinates[0].at(-1)
      );
      expect(scene.location.longitude).toBeGreaterThanOrEqual(-180);
      expect(scene.location.longitude).toBeLessThanOrEqual(180);
      expect(scene.location.latitude).toBeGreaterThanOrEqual(-90);
      expect(scene.location.latitude).toBeLessThanOrEqual(90);
      expect(scene.evidence[0].attribution.sourcePageUrl).toMatch(/^https:\/\/commons\.wikimedia\.org/);
    }
  });

  it("uses meaningfully different curated scene data", () => {
    const [first, second] = demoScenes;

    expect(first.id).not.toBe(second.id);
    expect(first.building.material).not.toBe(second.building.material);
    expect(first.building.floors).not.toBe(second.building.floors);
    expect(first.footprint.widthM).not.toBe(second.footprint.widthM);
  });
});
