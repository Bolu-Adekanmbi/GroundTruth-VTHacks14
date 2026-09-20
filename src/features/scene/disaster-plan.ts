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
    floodWater: DisasterTransform | null;
    floodStains: DisasterTransform[];
    windPanels: DisasterTransform[];
    structuralCracks: DisasterTransform[];
    structuralBraces: DisasterTransform[];
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

  // Generate damage overlays based on damage type and severity
  if (settings.damageType !== "none" && settings.severity > 0.1) {
    // Roof damage markers
    if (["fire", "wind", "structural"].includes(settings.damageType)) {
      const roofMarkerCount = Math.ceil(settings.severity * 3);
      for (let i = 0; i < roofMarkerCount; i++) {
        const offset = (i - (roofMarkerCount - 1) / 2) * 5;
        overlays.push({
          position: [offset, scene.heightM + 0.9, 0],
          scale: [Math.max(10, scene.bounds.width * 0.24), 0.22, Math.max(8, scene.bounds.depth * 0.3)],
          yawRad: 0,
          type: "damage-roof"
        });
      }
    }

    // Facade damage markers
    if (["fire", "flood", "wind"].includes(settings.damageType)) {
      const facadeMarkerCount = Math.ceil(settings.severity * 2);
      for (let i = 0; i < facadeMarkerCount; i++) {
        const facade = scene.facades[i % scene.facades.length];
        if (facade) {
          overlays.push({
            position: [
              facade.midpoint.x + Math.sin(facade.yawRad) * 0.3,
              scene.heightM * 0.6,
              facade.midpoint.z + Math.cos(facade.yawRad) * 0.3
            ],
            scale: [0.3, 1.8, 0.2],
            yawRad: facade.yawRad,
            type: "damage-facade"
          });
        }
      }
    }
  }

  // Generate hazard zone if hazards are specified
  const hasHazards = settings.hazards.length > 0;
  const simulatedDamage = {
    fireScorch: settings.damageType === "fire" ? buildFireScorch(damageFacades, scene, settings.severity) : [],
    floodWater: settings.damageType === "flood" ? buildFloodWater(scene, settings.severity) : null,
    floodStains: settings.damageType === "flood" ? buildFloodStains(damageFacades, scene, settings.severity) : [],
    windPanels: settings.damageType === "wind" ? buildWindPanels(scene, settings.severity, random) : [],
    structuralCracks: settings.damageType === "structural" ? buildStructuralCracks(damageFacades, scene, settings.severity, random) : [],
    structuralBraces: settings.damageType === "structural" ? buildStructuralBraces(damageFacades, scene, settings.severity) : []
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
  const waterHeight = Math.max(0.18, Math.min(scene.heightM * 0.24, 0.22 + severity * scene.heightM * 0.18));
  return {
    position: [0, waterHeight, 0],
    scale: [scene.bounds.width * 1.35, 0.08, scene.bounds.depth * 1.35],
    yawRad: 0
  };
}

function buildFloodStains(facades: ScenePlan["facades"], scene: ScenePlan, severity: number): DisasterTransform[] {
  const waterHeight = Math.max(0.18, Math.min(scene.heightM * 0.24, 0.22 + severity * scene.heightM * 0.18));
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
  const count = Math.max(2, Math.ceil(severity * 7));
  return Array.from({ length: count }, (_, index) => ({
    position: [
      (random() - 0.5) * scene.bounds.width * 0.9,
      index % 2 === 0 ? scene.heightM + 0.7 + random() * 1.8 : 0.28,
      (random() - 0.5) * scene.bounds.depth * 0.9
    ],
    scale: [2 + random() * 2.8, 0.12 + random() * 0.1, 1.2 + random() * 1.7],
    yawRad: random() * Math.PI
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
