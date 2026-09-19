import { describe, expect, it, vi } from "vitest";
import { geocodeAddress, lookupFootprint } from "./gis-adapters.js";

describe("GIS adapters", () => {
  it("geocodes curated addresses without live services", async () => {
    const response = await geocodeAddress("800 Drillfield Drive, Blacksburg, VA 24061", {
      fetcher: vi.fn() as unknown as typeof fetch,
      env: { GROUNDTRUTH_ENABLE_LIVE_GIS: "false" }
    });

    expect(response.source).toBe("curated");
    expect(response.result?.source).toBe("curated");
    expect(response.result?.longitude).toBeCloseTo(-80.42351);
  });

  it("returns a recoverable fallback when live geocoding is disabled", async () => {
    const response = await geocodeAddress("1 Imaginary Demo Way", {
      fetcher: vi.fn() as unknown as typeof fetch,
      env: { GROUNDTRUTH_ENABLE_LIVE_GIS: "false" }
    });

    expect(response.source).toBe("fallback");
    expect(response.result).toBeUndefined();
    expect(response.warnings[0]).toContain("disabled");
  });

  it("returns the seeded authoritative OSM footprint before live lookup", async () => {
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
    expect(response.result.source).toBe("osm");
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

  it("chooses the OSM building containing the resolved location, not the first nearby way", async () => {
    const response = await lookupFootprint(
      { longitude: -80, latitude: 37, widthM: 30, depthM: 20, bearingDeg: 0 },
      {
        env: { GROUNDTRUTH_ENABLE_LIVE_GIS: "true" },
        fetcher: vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            elements: [
              { type: "way", tags: { name: "Nearby but wrong" }, geometry: [{ lon: -80.0003, lat: 37 }, { lon: -80.0002, lat: 37 }, { lon: -80.0002, lat: 37.0001 }, { lon: -80.0003, lat: 37.0001 }] },
              { type: "way", tags: { name: "Containing building" }, geometry: [{ lon: -80.0001, lat: 36.9999 }, { lon: -79.9999, lat: 36.9999 }, { lon: -79.9999, lat: 37.0001 }, { lon: -80.0001, lat: 37.0001 }] }
            ]
          })
        }) as unknown as typeof fetch
      }
    );

    expect(response.result.source).toBe("osm");
    expect(response.result.feature.properties.osm_name).toBe("Containing building");
  });
});
