import type { SceneProject } from "../../../shared/scene-schema";
import type { ScenePlan, WindowPlan } from "./scene-plan";

export interface ScorchedTransform {
  position: [number, number, number];
  scale: [number, number, number];
  yawRad: number;
}

export interface ScorchedPlan {
  boardedWindows: ScorchedTransform[];
  brokenWindows: ScorchedTransform[];
  scorchPatches: ScorchedTransform[];
  roofDamage: ScorchedTransform[];
  debris: ScorchedTransform[];
  overgrowth: ScorchedTransform[];
  gameplay: {
    assetClass: string;
    traversal: string;
    condition: string;
    tags: string[];
  };
}

export function buildScorchedPlan(project: SceneProject, scene: ScenePlan): ScorchedPlan {
  const settings = project.scenario.scorched;
  const random = createSeededRandom(scene.seed);
  const windows = shuffled(scene.windows, random);
  const visibleFirstWindows = [
    ...windows.filter((window) => window.facadeIndex === scene.frontFacadeIndex),
    ...windows.filter((window) => window.facadeIndex !== scene.frontFacadeIndex)
  ];
  const boardCount = Math.max(2, Math.round(windows.length * settings.boardedWindowRatio));
  const brokenCount = Math.max(2, Math.round(windows.length * Math.min(0.82, settings.decayIntensity * 0.44 + settings.scorchIntensity * 0.36)));
  const scorchCount = Math.max(3, Math.round(Math.min(44, windows.length) * (0.2 + settings.scorchIntensity * 0.8)));
  const roofDamageCount = Math.max(1, Math.ceil(settings.scorchIntensity * 5));
  const debrisCount = Math.max(3, Math.round(24 * settings.debrisDensity));
  const overgrowthCount = Math.max(3, Math.round(36 * settings.overgrowthIntensity));

  return {
    boardedWindows: windows.slice(0, boardCount).flatMap((window) => makeBoards(window)),
    brokenWindows: visibleFirstWindows.slice(boardCount, boardCount + brokenCount).map((window, index) => ({
      position: offsetFromFacade(window, 0.18),
      scale: [window.scale[0] * (0.72 + (index % 3) * 0.08), window.scale[1] * 0.52, 0.13],
      yawRad: window.yawRad
    })),
    scorchPatches: visibleFirstWindows.slice(0, scorchCount).map((window, index) => ({
      position: offsetFromFacade(window, 0.2),
      scale: [window.scale[0] * (1.5 + (index % 3) * 0.22), window.scale[1] * (1.75 + (index % 2) * 0.18), 1],
      yawRad: window.yawRad
    })),
    roofDamage: Array.from({ length: roofDamageCount }, (_, index) => ({
      position: [
        (random() - 0.5) * scene.bounds.width * 0.5,
        scene.heightM + 0.76 + index * 0.08,
        (random() - 0.5) * scene.bounds.depth * 0.5
      ],
      scale: [
        Math.max(3, scene.bounds.width * (0.14 + random() * 0.08)),
        0.14 + random() * 0.13,
        Math.max(2.6, scene.bounds.depth * (0.1 + random() * 0.07))
      ],
      yawRad: random() * 0.38
    })),
    debris: Array.from({ length: debrisCount }, (_, index) => {
      const spread = 4 + (index % 4) * 1.2;
      return {
        position: [
          scene.entrance.position[0] + (random() - 0.5) * spread,
          0.24,
          scene.entrance.position[2] + (random() - 0.5) * spread
        ],
        scale: [0.35 + random() * 0.9, 0.16 + random() * 0.3, 0.24 + random() * 0.7],
        yawRad: random() * Math.PI
      };
    }),
    overgrowth: Array.from({ length: overgrowthCount }, (_, index) => {
      const facade = scene.facades[index % scene.facades.length];
      const along = random() - 0.5;
      return {
        position: [
          facade.midpoint.x + (facade.end.x - facade.start.x) * along,
          0.45,
          facade.midpoint.z + (facade.end.z - facade.start.z) * along
        ],
        scale: [0.32 + random() * 0.38, 0.7 + random() * 1.3, 0.32 + random() * 0.38],
        yawRad: random() * Math.PI
      };
    }),
    gameplay: {
      assetClass: "Scorched landmark",
      traversal: settings.debrisDensity > 0.55 ? "Obstructed exterior" : "Perimeter accessible",
      condition: settings.scorchIntensity > 0.55 ? "Heavy fire damage" : "Weathered fire damage",
      tags: Array.from(new Set(["generated", "scorched-nebraska", ...settings.gameplayTags]))
    }
  };
}

function makeBoards(window: WindowPlan): ScorchedTransform[] {
  return [-0.31, 0, 0.31].map((offset) => ({
    position: offsetFromFacade({ ...window, position: [window.position[0], window.position[1] + window.scale[1] * offset, window.position[2]] }, 0.2),
    scale: [window.scale[0] * 1.15, 0.16, 0.17],
    yawRad: window.yawRad
  }));
}

function offsetFromFacade(window: WindowPlan, distance: number): [number, number, number] {
  return [
    window.position[0] + Math.sin(window.yawRad) * distance,
    window.position[1],
    window.position[2] + Math.cos(window.yawRad) * distance
  ];
}

function shuffled<T>(items: T[], random: () => number) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createSeededRandom(seed: number) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
