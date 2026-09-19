import type { SceneProject } from "./scene-schema.js";

export type LngLat = [longitude: number, latitude: number];

export interface GeoBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface LocalMeterPoint {
  x: number;
  z: number;
}

const EARTH_RADIUS_M = 6_371_008.8;
const METERS_PER_DEGREE_LATITUDE = 111_320;

export function normalizeBearing(degrees: number) {
  return ((degrees % 360) + 360) % 360;
}

export function getOuterRing(project: SceneProject): LngLat[] {
  return project.footprint.feature.geometry.coordinates[0];
}

export function getBounds(coordinates: LngLat[]): GeoBounds {
  return coordinates.reduce<GeoBounds>(
    (bounds, [longitude, latitude]) => ({
      west: Math.min(bounds.west, longitude),
      south: Math.min(bounds.south, latitude),
      east: Math.max(bounds.east, longitude),
      north: Math.max(bounds.north, latitude)
    }),
    {
      west: Number.POSITIVE_INFINITY,
      south: Number.POSITIVE_INFINITY,
      east: Number.NEGATIVE_INFINITY,
      north: Number.NEGATIVE_INFINITY
    }
  );
}

export function getBoundsArray(bounds: GeoBounds): [[number, number], [number, number]] {
  return [
    [bounds.west, bounds.south],
    [bounds.east, bounds.north]
  ];
}

export function getPolygonCentroid(coordinates: LngLat[]): LngLat {
  const ring = stripClosingCoordinate(coordinates);
  let twiceArea = 0;
  let weightedLongitude = 0;
  let weightedLatitude = 0;

  ring.forEach((coordinate, index) => {
    const next = ring[(index + 1) % ring.length];
    const cross = coordinate[0] * next[1] - next[0] * coordinate[1];
    twiceArea += cross;
    weightedLongitude += (coordinate[0] + next[0]) * cross;
    weightedLatitude += (coordinate[1] + next[1]) * cross;
  });

  if (Math.abs(twiceArea) < Number.EPSILON) {
    const bounds = getBounds(ring);
    return [(bounds.west + bounds.east) / 2, (bounds.south + bounds.north) / 2];
  }

  return [weightedLongitude / (3 * twiceArea), weightedLatitude / (3 * twiceArea)];
}

export function getProjectCentroid(project: SceneProject): LngLat {
  return getPolygonCentroid(getOuterRing(project));
}

export function getApproximateDimensionsM(coordinates: LngLat[]) {
  const bounds = getBounds(coordinates);
  const centerLatitude = (bounds.south + bounds.north) / 2;

  return {
    widthM: distanceM([bounds.west, centerLatitude], [bounds.east, centerLatitude]),
    depthM: distanceM([(bounds.west + bounds.east) / 2, bounds.south], [
      (bounds.west + bounds.east) / 2,
      bounds.north
    ])
  };
}

export function toLocalMeters(coordinates: LngLat[], origin: LngLat): LocalMeterPoint[] {
  const latitudeScale = Math.cos(toRadians(origin[1])) * METERS_PER_DEGREE_LATITUDE;

  return coordinates.map(([longitude, latitude]) => ({
    x: (longitude - origin[0]) * latitudeScale,
    z: (latitude - origin[1]) * METERS_PER_DEGREE_LATITUDE
  }));
}

export function formatCoordinate([longitude, latitude]: LngLat, precision = 5) {
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
}

export function formatDimension(valueM: number) {
  return `${Math.round(valueM)} m`;
}

function stripClosingCoordinate(coordinates: LngLat[]) {
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  if (first && last && first[0] === last[0] && first[1] === last[1]) {
    return coordinates.slice(0, -1);
  }

  return coordinates;
}

function distanceM(start: LngLat, end: LngLat) {
  const deltaLatitude = toRadians(end[1] - start[1]);
  const deltaLongitude = toRadians(end[0] - start[0]);
  const startLatitude = toRadians(start[1]);
  const endLatitude = toRadians(end[1]);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
