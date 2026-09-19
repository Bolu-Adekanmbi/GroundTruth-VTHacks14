import {
  getPolygonCentroid,
  getOuterRing,
  toLocalMeters,
  type LocalMeterPoint
} from "../../../shared/geo";
import type { BuildingTraits, SceneProject } from "../../../shared/scene-schema";

export interface SceneBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  width: number;
  depth: number;
}

export interface FacadePlan {
  index: number;
  start: LocalMeterPoint;
  end: LocalMeterPoint;
  midpoint: LocalMeterPoint;
  normalBearingDeg: number;
  yawRad: number;
  lengthM: number;
  isFront: boolean;
  isEntrance: boolean;
}

export interface WindowPlan {
  position: [number, number, number];
  scale: [number, number, number];
  yawRad: number;
  facadeIndex: number;
}

export interface ScenePlan {
  projectId: string;
  outline: LocalMeterPoint[];
  bounds: SceneBounds;
  heightM: number;
  floors: number;
  material: BuildingTraits["material"];
  roofType: BuildingTraits["roofType"];
  facades: FacadePlan[];
  windows: WindowPlan[];
  entrance: { position: [number, number, number]; yawRad: number };
  frontFacadeIndex: number;
  seed: number;
}

const WINDOW_SURFACE_OFFSET_M = 0.1;
const ENTRANCE_SURFACE_OFFSET_M = 0.23;

const materialPalette: Record<BuildingTraits["material"], string> = {
  brick: "#8f4f3f",
  concrete: "#b7b1a4",
  glass: "#789aa0",
  siding: "#6e8a83",
  metal: "#8b9792"
};

export function getMaterialColor(material: BuildingTraits["material"]) {
  return materialPalette[material];
}

export function buildScenePlan(project: SceneProject): ScenePlan {
  const ring = getOuterRing(project);
  const centroid = getPolygonCentroid(ring);
  // Three's scene frame uses +Z south so a north-up map and the elevated
  // camera share the same visual orientation.
  const outline = stripClosingPoint(toLocalMeters(ring, centroid)).map((point) => ({
    x: point.x,
    z: -point.z
  }));
  const bounds = getBounds(outline);
  const frontBearing = project.footprint.facadeOrientation?.frontBearingDeg ?? project.footprint.bearingDeg;
  const entranceBearing = getEntranceBearing(project.building.entrancePosition, frontBearing);
  const facades = outline.map((start, index) => {
    const end = outline[(index + 1) % outline.length];
    const midpoint = { x: (start.x + end.x) / 2, z: (start.z + end.z) / 2 };
    const edge = normalizeVector({ x: end.x - start.x, z: end.z - start.z });
    const candidateNormal = { x: -edge.z, z: edge.x };
    const outward = candidateNormal.x * midpoint.x + candidateNormal.z * midpoint.z < 0
      ? { x: -candidateNormal.x, z: -candidateNormal.z }
      : candidateNormal;
    const normalBearingDeg = bearingFromVector(outward);
    return {
      index,
      start,
      end,
      midpoint,
      normalBearingDeg,
      // Three's local +Z is the thin/depth axis of a window. Align it to the
      // outward facade normal so windows and scenario overlays stay on the wall.
      yawRad: Math.atan2(outward.x, outward.z),
      lengthM: Math.hypot(end.x - start.x, end.z - start.z),
      isFront: false,
      isEntrance: false
    };
  });
  const frontFacadeIndex = closestFacadeIndex(facades, frontBearing);
  const entranceFacadeIndex = closestFacadeIndex(facades, entranceBearing);
  const markedFacades = facades.map((facade) => ({
    ...facade,
    isFront: facade.index === frontFacadeIndex,
    isEntrance: facade.index === entranceFacadeIndex
  }));
  const heightM = Math.max(project.building.floors * 2.8, project.building.heightM);
  const windows = buildWindows(markedFacades, project.building, heightM);
  const entranceFacade = markedFacades[entranceFacadeIndex];

  return {
    projectId: project.id,
    outline,
    bounds,
    heightM,
    floors: project.building.floors,
    material: project.building.material,
    roofType: project.building.roofType,
    facades: markedFacades,
    windows,
    entrance: {
      position: [
        entranceFacade.midpoint.x + Math.sin(entranceFacade.yawRad) * ENTRANCE_SURFACE_OFFSET_M,
        1.35,
        entranceFacade.midpoint.z + Math.cos(entranceFacade.yawRad) * ENTRANCE_SURFACE_OFFSET_M
      ],
      yawRad: entranceFacade.yawRad
    },
    frontFacadeIndex,
    seed: hashProject(project)
  };
}

function buildWindows(facades: FacadePlan[], traits: BuildingTraits, heightM: number) {
  const floorHeight = heightM / traits.floors;
  const floorIndices = Array.from({ length: traits.floors }, (_, index) => index);

  return facades.flatMap((facade) => {
    const spacing = traits.windowPattern === "sparse" ? 6 : traits.windowPattern === "vertical-bands" ? 4 : 4.8;
    const columns = Math.max(1, Math.min(22, Math.floor(facade.lengthM / spacing)));
    const windowWidth = Math.min(2.1, Math.max(0.75, (facade.lengthM - 2) / columns - 0.55));
    const direction = normalizeVector({
      x: facade.end.x - facade.start.x,
      z: facade.end.z - facade.start.z
    });

    return floorIndices.flatMap((floorIndex) =>
      Array.from({ length: columns }, (_, columnIndex) => {
        const distance = ((columnIndex + 0.5) / columns - 0.5) * Math.max(0, facade.lengthM - 2);
        const verticalOffset = traits.windowPattern === "mixed" && columnIndex % 2 === 0 ? 0.12 : 0;
        const height = traits.windowPattern === "vertical-bands" ? floorHeight * 0.7 : floorHeight * 0.52;

        return {
          position: [
            facade.midpoint.x + direction.x * distance + Math.sin(facade.yawRad) * WINDOW_SURFACE_OFFSET_M,
            floorHeight * (floorIndex + 0.53) + verticalOffset,
            facade.midpoint.z + direction.z * distance + Math.cos(facade.yawRad) * WINDOW_SURFACE_OFFSET_M
          ] as [number, number, number],
          scale: [windowWidth, height, 0.18] as [number, number, number],
          yawRad: facade.yawRad,
          facadeIndex: facade.index
        };
      })
    );
  });
}

function getBounds(points: LocalMeterPoint[]): SceneBounds {
  const values = points.reduce(
    (current, point) => ({
      minX: Math.min(current.minX, point.x),
      maxX: Math.max(current.maxX, point.x),
      minZ: Math.min(current.minZ, point.z),
      maxZ: Math.max(current.maxZ, point.z)
    }),
    { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }
  );

  return { ...values, width: values.maxX - values.minX, depth: values.maxZ - values.minZ };
}

function getEntranceBearing(position: BuildingTraits["entrancePosition"], fallback: number) {
  const bearings: Partial<Record<BuildingTraits["entrancePosition"], number>> = {
    north: 0,
    east: 90,
    south: 180,
    west: 270
  };

  return bearings[position] ?? fallback;
}

function closestFacadeIndex(facades: FacadePlan[], bearing: number) {
  return facades.reduce(
    (best, facade) =>
      angularDistance(facade.normalBearingDeg, bearing) < angularDistance(best.normalBearingDeg, bearing)
        ? facade
        : best,
    facades[0]
  ).index;
}

function stripClosingPoint(points: LocalMeterPoint[]) {
  const first = points[0];
  const last = points.at(-1);
  return first && last && first.x === last.x && first.z === last.z ? points.slice(0, -1) : points;
}

function normalizeVector(point: LocalMeterPoint) {
  const length = Math.hypot(point.x, point.z) || 1;
  return { x: point.x / length, z: point.z / length };
}

function bearingFromVector(vector: LocalMeterPoint) {
  return (Math.atan2(vector.x, -vector.z) * 180 / Math.PI + 360) % 360;
}

function angularDistance(left: number, right: number) {
  return Math.abs(((left - right + 540) % 360) - 180);
}

function hashProject(project: SceneProject) {
  return `${project.id}:${project.footprint.bearingDeg}:${project.building.heightM}`.split("").reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    17
  );
}
