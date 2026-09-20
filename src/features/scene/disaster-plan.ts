import type { SceneProject } from "../../../shared/scene-schema";
import type { ScenePlan } from "./scene-plan";

export interface DisasterOverlay {
  position: [number, number, number];
  scale: [number, number, number];
  yawRad: number;
  type: "access-blocked" | "hazard-zone" | "damage-roof" | "damage-facade";
}

export interface DisasterTransform {
  position: [number, number, number];
  scale: [number, number, number];
  yawRad: number;
  rotation?: [number, number, number];
}

export interface DisasterPlan {
  overlays: DisasterOverlay[];
  hazardZone: {
    active: boolean;
    type: string;
    intensity: number;
  };
  accessStatus: "open" | "limited" | "blocked" | "unknown";
  simulatedDamage: {
    fireScorch: DisasterTransform[];
    fireFlames: DisasterTransform[];
    fireSmoke: DisasterTransform[];
    roofBreaches: DisasterTransform[];
    floodWater: DisasterTransform | null;
    floodStains: DisasterTransform[];
    floodDebris: DisasterTransform[];
    windPanels: DisasterTransform[];
    windBreaches: DisasterTransform[];
    windDebris: DisasterTransform[];
    structuralCracks: DisasterTransform[];
    structuralBraces: DisasterTransform[];
    collapsedPanels: DisasterTransform[];
  };
  operational: {
    summary: string;
    damageType: string;
    severity: number;
  };
}

export function buildDisasterPlan(project: SceneProject, scene: ScenePlan): DisasterPlan {
  const settings = project.scenario.disaster;
  const overlays: DisasterOverlay[] = [];
  const random = createSeededRandom(scene.seed + Math.round(settings.severity * 10_000));
  const damageFacades = [
    scene.facades[scene.frontFacadeIndex],
    ...scene.facades.filter((facade) => facade.index !== scene.frontFacadeIndex)
  ];

  // Generate overlays based on access status
  if (settings.accessStatus === "blocked" || settings.blockedEntrances?.includes("primary")) {
    // Place blocked access markers at each entrance
    overlays.push({
      position: [scene.entrance.position[0], scene.entrance.position[1] + 1.2, scene.entrance.position[2]],
      scale: [0.5, 1.8, 0.5],
      yawRad: 0,
      type: "access-blocked"
    });
  }

  // Generate hazard zone if hazards are specified
  const hasHazards = settings.hazards.length > 0;
  const simulatedDamage = {
    fireScorch: settings.damageType === "fire" ? buildFireScorch(damageFacades, scene, settings.severity) : [],
    fireFlames: settings.damageType === "fire" ? buildRoofEffects(scene, settings.severity, random, "flame") : [],
    fireSmoke: settings.damageType === "fire" ? buildRoofEffects(scene, settings.severity, random, "smoke") : [],
    roofBreaches: ["fire", "wind", "structural"].includes(settings.damageType) ? buildRoofBreaches(scene, settings.severity, random) : [],
    floodWater: settings.damageType === "flood" ? buildFloodWater(scene, settings.severity) : null,
    floodStains: settings.damageType === "flood" ? buildFloodStains(damageFacades, scene, settings.severity) : [],
    floodDebris: settings.damageType === "flood" ? buildGroundDebris(scene, settings.severity, random, true) : [],
    windPanels: settings.damageType === "wind" ? buildWindPanels(scene, settings.severity, random) : [],
    windBreaches: settings.damageType === "wind" ? buildFacadeBreaches(damageFacades, scene, settings.severity, random) : [],
    windDebris: settings.damageType === "wind" ? buildGroundDebris(scene, settings.severity, random, false) : [],
    structuralCracks: settings.damageType === "structural" ? buildStructuralCracks(damageFacades, scene, settings.severity, random) : [],
    structuralBraces: settings.damageType === "structural" ? buildStructuralBraces(damageFacades, scene, settings.severity) : [],
    collapsedPanels: settings.damageType === "structural" ? buildCollapsedPanels(damageFacades, scene, settings.severity, random) : []
  };

  return {
    overlays,
    hazardZone: {
      active: hasHazards && settings.severity > 0.1,
      type: settings.damageType,
      intensity: settings.severity
    },
    accessStatus: settings.accessStatus,
    simulatedDamage,
    operational: {
      summary: settings.responderNote || createResponderSummary(settings),
      damageType: settings.damageType,
      severity: settings.severity
    }
  };
}

function buildRoofEffects(scene: ScenePlan, severity: number, random: () => number, kind: "flame" | "smoke"): DisasterTransform[] {
  const count = Math.ceil(severity * (kind === "flame" ? 12 : 9));
  return Array.from({ length: count }, (_, index) => {
    const x = (random() - 0.5) * scene.bounds.width * 0.5;
    const z = (random() - 0.5) * scene.bounds.depth * 0.5;
    const lift = kind === "smoke" ? 3.5 + (index % 4) * 2.1 : 0.9;
    return {
      position: [x, scene.heightM + lift, z],
      scale: kind === "smoke"
        ? [2.8 + random() * 3.8, 2.5 + random() * 4.5, 2.8 + random() * 3.8]
        : [0.9 + random() * 1.5, 2.5 + random() * 4.5, 0.9 + random() * 1.5],
      yawRad: random() * Math.PI
    };
  });
}

function buildRoofBreaches(scene: ScenePlan, severity: number, random: () => number): DisasterTransform[] {
  return Array.from({ length: Math.ceil(severity * 7) }, () => ({
    position: [
      (random() - 0.5) * scene.bounds.width * 0.58,
      scene.heightM + 0.78,
      (random() - 0.5) * scene.bounds.depth * 0.58
    ],
    scale: [2.8 + random() * 5.5, 0.14, 2.2 + random() * 4.2],
    yawRad: random() * Math.PI
  }));
}

function buildFireScorch(facades: ScenePlan["facades"], scene: ScenePlan, severity: number): DisasterTransform[] {
  const count = Math.max(2, Math.ceil(severity * 7));
  return Array.from({ length: count }, (_, index) => {
    const facade = facades[index % facades.length];
    return {
      position: [
        facade.midpoint.x + Math.sin(facade.yawRad) * 0.23,
        scene.heightM * (0.25 + (index % 3) * 0.2),
        facade.midpoint.z + Math.cos(facade.yawRad) * 0.23
      ],
      scale: [Math.min(facade.lengthM * 0.45, 4 + severity * 5), 2 + severity * 4, 1],
      yawRad: facade.yawRad
    };
  });
}

function buildFloodWater(scene: ScenePlan, severity: number): DisasterTransform {
  const waterHeight = Math.max(0.18, Math.min(scene.heightM * 0.32, 0.22 + severity * scene.heightM * 0.25));
  return {
    position: [0, waterHeight, 0],
    scale: [scene.bounds.width * 1.35, Math.max(0.1, waterHeight * 2), scene.bounds.depth * 1.35],
    yawRad: 0
  };
}

function buildFloodStains(facades: ScenePlan["facades"], scene: ScenePlan, severity: number): DisasterTransform[] {
  const waterHeight = Math.max(0.18, Math.min(scene.heightM * 0.32, 0.22 + severity * scene.heightM * 0.25));
  return facades.map((facade) => ({
    position: [
      facade.midpoint.x + Math.sin(facade.yawRad) * 0.22,
      waterHeight + 0.08,
      facade.midpoint.z + Math.cos(facade.yawRad) * 0.22
    ],
    scale: [Math.max(1.5, facade.lengthM * 0.96), 0.22 + severity * 0.26, 0.08],
    yawRad: facade.yawRad
  }));
}

function buildWindPanels(scene: ScenePlan, severity: number, random: () => number): DisasterTransform[] {
  const count = Math.ceil(severity * 12);
  return Array.from({ length: count }, (_, index) => ({
    position: [
      (random() - 0.5) * scene.bounds.width * 0.9,
      index % 2 === 0 ? scene.heightM + 1.8 + random() * 5 : 0.28 + random() * 1.2,
      (random() - 0.5) * scene.bounds.depth * 0.9
    ],
    scale: [2 + random() * 2.8, 0.12 + random() * 0.1, 1.2 + random() * 1.7],
    yawRad: random() * Math.PI,
    rotation: [(random() - 0.5) * 1.1, random() * Math.PI, (random() - 0.5) * 0.9]
  }));
}

function buildFacadeBreaches(facades: ScenePlan["facades"], scene: ScenePlan, severity: number, random: () => number): DisasterTransform[] {
  return Array.from({ length: Math.ceil(severity * 8) }, (_, index) => {
    const facade = facades[index % facades.length];
    return {
      position: [
        facade.midpoint.x + Math.sin(facade.yawRad) * 0.29,
        scene.heightM * (0.3 + random() * 0.5),
        facade.midpoint.z + Math.cos(facade.yawRad) * 0.29
      ],
      scale: [Math.min(facade.lengthM * 0.36, 2.5 + random() * 5), 2 + random() * 5, 0.12],
      yawRad: facade.yawRad
    };
  });
}

function buildGroundDebris(scene: ScenePlan, severity: number, random: () => number, floating: boolean): DisasterTransform[] {
  return Array.from({ length: Math.ceil(severity * 20) }, () => ({
    position: [
      (random() - 0.5) * scene.bounds.width * 1.15,
      floating ? 0.45 + severity * scene.heightM * 0.12 : 0.2 + random() * 0.45,
      (random() - 0.5) * scene.bounds.depth * 1.15
    ],
    scale: [0.5 + random() * 2.2, 0.15 + random() * 0.4, 0.35 + random() * 1.4],
    yawRad: random() * Math.PI,
    rotation: [random() * 0.3, random() * Math.PI, random() * 0.3]
  }));
}

function buildStructuralCracks(facades: ScenePlan["facades"], scene: ScenePlan, severity: number, random: () => number): DisasterTransform[] {
  const count = Math.max(2, Math.ceil(severity * 6));
  return Array.from({ length: count }, (_, index) => {
    const facade = facades[index % facades.length];
    return {
      position: [
        facade.midpoint.x + Math.sin(facade.yawRad) * 0.25,
        scene.heightM * (0.2 + random() * 0.55),
        facade.midpoint.z + Math.cos(facade.yawRad) * 0.25
      ],
      scale: [0.1 + random() * 0.14, 2 + severity * 5, 1],
      yawRad: facade.yawRad + (random() - 0.5) * 0.38
    };
  });
}

function buildStructuralBraces(facades: ScenePlan["facades"], scene: ScenePlan, severity: number): DisasterTransform[] {
  const facade = facades[0];
  return [-1, 1].map((side) => ({
    position: [
      facade.midpoint.x + Math.sin(facade.yawRad) * 0.65,
      scene.heightM * 0.3,
      facade.midpoint.z + Math.cos(facade.yawRad) * 0.65
    ],
    scale: [0.18, scene.heightM * (0.42 + severity * 0.16), 0.18],
    yawRad: facade.yawRad + side * 0.46
  }));
}

function buildCollapsedPanels(facades: ScenePlan["facades"], scene: ScenePlan, severity: number, random: () => number): DisasterTransform[] {
  return Array.from({ length: Math.ceil(severity * 8) }, (_, index) => {
    const facade = facades[index % facades.length];
    const outwardX = Math.sin(facade.yawRad);
    const outwardZ = Math.cos(facade.yawRad);
    return {
      position: [
        facade.midpoint.x + outwardX * (1.4 + random() * 4),
        0.8 + random() * 1.4,
        facade.midpoint.z + outwardZ * (1.4 + random() * 4)
      ],
      scale: [2 + random() * 4.5, 0.28 + random() * 0.5, 1.2 + random() * 3],
      yawRad: facade.yawRad + (random() - 0.5) * 0.9,
      rotation: [(random() - 0.5) * 0.65, facade.yawRad, (random() - 0.5) * 0.5]
    };
  });
}

function createSeededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function createResponderSummary(settings: SceneProject["scenario"]["disaster"]) {
  const condition = settings.damageType === "none"
    ? "No damage condition has been entered"
    : `${settings.damageType} damage is ${Math.round(settings.severity * 100)}% severity`;
  const access = settings.blockedEntrances?.includes("primary") || settings.accessStatus === "blocked"
    ? "Primary entrance is blocked"
    : `Access is ${settings.accessStatus}`;
  const hazards = settings.hazards.length ? ` Visible or entered hazards: ${settings.hazards.join(", ")}.` : "";
  return `${condition}. ${access}.${hazards} Requires verification; not a structural safety determination.`;
}
