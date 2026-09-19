import { describe, expect, it } from "vitest";
import { demoScenes } from "./demo-scenes.js";
import {
  createRectangleFootprint,
  formatCoordinate,
  getApproximateDimensionsM,
  getBounds,
  getOuterRing,
  getProjectCentroid,
  rotateRingAroundCentroid,
  normalizeBearing,
  scaleRingAroundCentroid,
  translateRingMeters,
  toLocalMeters
} from "./geo.js";

describe("geo utilities", () => {
  it("preserves GeoJSON longitude, latitude coordinate order", () => {
    const burruss = demoScenes.find((scene) => scene.id === "burruss-hall")!;
    const firstCoordinate = getOuterRing(burruss)[0];

    expect(firstCoordinate).toEqual([-80.42412, 37.22914]);
    expect(formatCoordinate(firstCoordinate)).toBe("37.22914, -80.42412");
  });

  it("computes bounds and centroids for both fixture footprints", () => {
    const burruss = demoScenes.find((scene) => scene.id === "burruss-hall")!;
    const willard = demoScenes.find((scene) => scene.id === "willard-building")!;

    expect(getBounds(getOuterRing(burruss))).toEqual({
      west: -80.42439,
      south: 37.22863,
      east: -80.42265,
      north: 37.22914
    });
    expect(getProjectCentroid(burruss)[0]).toBeCloseTo(-80.42351, 3);
    expect(getProjectCentroid(burruss)[1]).toBeCloseTo(37.22886, 3);
    expect(getProjectCentroid(willard)[0]).toBeCloseTo(-77.86442, 3);
    expect(getProjectCentroid(willard)[1]).toBeCloseTo(40.79576, 3);
  });

  it("derives approximate dimensions and local-meter coordinates", () => {
    const willard = demoScenes.find((scene) => scene.id === "willard-building")!;
    const ring = getOuterRing(willard);
    const centroid = getProjectCentroid(willard);
    const dimensions = getApproximateDimensionsM(ring);
    const localPoints = toLocalMeters(ring, centroid);

    expect(dimensions.widthM).toBeGreaterThan(80);
    expect(dimensions.depthM).toBeGreaterThan(40);
    expect(localPoints[0].x).toBeLessThan(0);
    expect(localPoints[0].z).toBeGreaterThan(0);
  });

  it("normalizes bearings to the canonical 0-359 degree range", () => {
    expect(normalizeBearing(-15)).toBe(345);
    expect(normalizeBearing(375)).toBe(15);
    expect(normalizeBearing(720)).toBe(0);
  });

  it("creates and corrects manual footprint rectangles in meters", () => {
    const center = [-80, 37] satisfies [number, number];
    const ring = createRectangleFootprint({ center, widthM: 40, depthM: 20, bearingDeg: 0 });
    const dimensions = getApproximateDimensionsM(ring);
    const shifted = translateRingMeters(ring, 5, -3);
    const rotated = rotateRingAroundCentroid(ring, 15);
    const scaled = scaleRingAroundCentroid(ring, 1.1);

    expect(ring).toHaveLength(5);
    expect(dimensions.widthM).toBeCloseTo(40, 0);
    expect(dimensions.depthM).toBeCloseTo(20, 0);
    expect(getPolygonDeltaMeters(ring, shifted).east).toBeCloseTo(5, 0);
    expect(rotated[0]).not.toEqual(ring[0]);
    expect(getApproximateDimensionsM(scaled).widthM).toBeGreaterThan(dimensions.widthM);
  });
});

function getPolygonDeltaMeters(start: [number, number][], end: [number, number][]) {
  const startCentroid = getApproximateCenter(start);
  const endCentroid = getApproximateCenter(end);
  const [local] = toLocalMeters([endCentroid], startCentroid);

  return { east: local.x, north: local.z };
}

function getApproximateCenter(ring: [number, number][]) {
  const bounds = getBounds(ring);
  return [(bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2] satisfies [
    number,
    number
  ];
}
