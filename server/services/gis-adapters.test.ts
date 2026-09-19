import { describe, expect, it, vi } from "vitest";
import { geocodeAddress, lookupFootprint } from "./gis-adapters.js";

describe("GIS adapters", () => {
  it("geocodes curated addresses without live services", async () => {
    const response = await geocodeAddress("800 Drillfield Drive, Blacksburg, VA 24061", {
      fetcher: vi.fn() as unknown as typeof fetch,
      env: {}
    });

    expect(response.source).toBe("curated");
    expect(response.result?.source).toBe("curated");
    expect(response.result?.longitude).toBeCloseTo(-80.42351);
  });

  it("returns a recoverable fallback when live geocoding is disabled", async () => {
    const response = await geocodeAddress("1 Imaginary Demo Way", {
      fetcher: vi.fn() as unknown as typeof fetch,
      env: {}
    });

    expect(response.source).toBe("fallback");
    expect(response.result).toBeUndefined();
    expect(response.warnings[0]).toContain("disabled");
  });

  it("returns curated footprints before live lookup", async () => {
    const response = await lookupFootprint(
      {
        sceneId: "burruss-hall",
        longitude: -80.42351,
        latitude: 37.22883,
        widthM: 30,
        depthM: 20,
        bearingDeg: 0
      },
      { fetcher: vi.fn() as unknown as typeof fetch, env: {} }
    );

    expect(response.source).toBe("curated");
    expect(response.result.source).toBe("curated");
    expect(response.result.feature.properties.scene_id).toBe("burruss-hall");
  });

  it("creates an editable manual rectangle when no footprint service is used", async () => {
    const response = await lookupFootprint(
      {
        longitude: -80,
        latitude: 37,
        widthM: 40,
        depthM: 24,
        bearingDeg: 15
      },
      { fetcher: vi.fn() as unknown as typeof fetch, env: {} }
    );

    expect(response.source).toBe("fallback");
    expect(response.result.source).toBe("manual-rectangle");
    expect(response.result.feature.geometry.coordinates[0]).toHaveLength(5);
  });
});
