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
  const facadeWindows = windows.filter((window) => window.facadeIndex !== scene.frontFacadeIndex);
  const boardCount = Math.round(windows.length * settings.boardedWindowRatio);
  const brokenCount = Math.round(windows.length * Math.min(0.76, settings.decayIntensity * 0.35 + settings.scorchIntensity * 0.28));
  const scorchCount = Math.round(Math.min(32, windows.length) * settings.scorchIntensity);
  const debrisCount = Math.round(18 * settings.debrisDensity);
  const overgrowthCount = Math.round(30 * settings.overgrowthIntensity);

  return {
    boardedWindows: windows.slice(0, boardCount).flatMap((window) => makeBoards(window)),
    brokenWindows: windows.slice(boardCount, boardCount + brokenCount).map((window) => ({
      position: offsetFromFacade(window, 0.12),
      scale: [window.scale[0] * 0.92, window.scale[1] * 0.86, 0.09],
      yawRad: window.yawRad
    })),
    scorchPatches: facadeWindows.slice(0, scorchCount).map((window, index) => ({
      position: offsetFromFacade(window, 0.16),
      scale: [window.scale[0] * (1.2 + (index % 3) * 0.16), window.scale[1] * 1.55, 1],
      yawRad: window.yawRad
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
