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
  decayPatches: ScorchedTransform[];
  roofDamage: ScorchedTransform[];
  debris: ScorchedTransform[];
  overgrowth: ScorchedTransform[];
  facadeVines: ScorchedTransform[];
  embers: ScorchedTransform[];
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
  const presentationFacades = [...scene.facades].sort((left, right) =>
    Math.sin(right.yawRad) + Math.cos(right.yawRad) - Math.sin(left.yawRad) - Math.cos(left.yawRad)
  );
  const visibleFirstWindows = [...windows].sort((left, right) => {
    const leftFacade = scene.facades[left.facadeIndex];
    const rightFacade = scene.facades[right.facadeIndex];
    return Math.sin(rightFacade.yawRad) + Math.cos(rightFacade.yawRad) - Math.sin(leftFacade.yawRad) - Math.cos(leftFacade.yawRad);
  });
  const frontFacade = presentationFacades[0];
  const boardCount = Math.round(windows.length * settings.boardedWindowRatio);
  const brokenCount = Math.round(windows.length * Math.min(0.82, settings.decayIntensity * 0.5 + settings.scorchIntensity * 0.38));
  const scorchCount = Math.round(Math.min(60, windows.length) * settings.scorchIntensity);
  const decayCount = Math.round(Math.min(48, windows.length) * settings.decayIntensity);
  const roofDamageCount = Math.ceil(settings.scorchIntensity * 8);
  const debrisCount = Math.round(36 * settings.debrisDensity);
  const overgrowthCount = Math.round(52 * settings.overgrowthIntensity);
  const vineCount = Math.round(22 * settings.overgrowthIntensity);

  return {
    boardedWindows: windows.slice(0, boardCount).flatMap((window) => makeBoards(window)),
    brokenWindows: visibleFirstWindows.slice(boardCount, boardCount + brokenCount).map((window, index) => ({
      position: offsetFromFacade(window, 0.18),
      scale: [window.scale[0] * (0.72 + (index % 3) * 0.08), window.scale[1] * 0.52, 0.13],
      yawRad: window.yawRad
    })),
    scorchPatches: visibleFirstWindows.slice(0, scorchCount).map((window, index) => ({
      position: offsetFromFacade(window, 0.2),
      scale: [window.scale[0] * (2 + (index % 3) * 0.35), window.scale[1] * (2.2 + (index % 2) * 0.35), 1],
      yawRad: window.yawRad
    })),
    decayPatches: visibleFirstWindows.slice().reverse().slice(0, decayCount).map((window, index) => ({
      position: offsetFromFacade(window, 0.14),
      scale: [window.scale[0] * (1.8 + (index % 4) * 0.25), window.scale[1] * (0.55 + (index % 3) * 0.2), 0.08],
      yawRad: window.yawRad + ((index % 3) - 1) * 0.06
    })),
    roofDamage: Array.from({ length: roofDamageCount }, (_, index) => ({
      position: [
        (random() - 0.5) * scene.bounds.width * 0.5,
        scene.heightM + 0.84 + index * 0.12,
        (random() - 0.5) * scene.bounds.depth * 0.5
      ],
      scale: [
        3 + random() * Math.min(6, scene.bounds.width * 0.08),
        0.12 + random() * 0.16,
        2.4 + random() * Math.min(4.5, scene.bounds.depth * 0.06)
      ],
      yawRad: random() * 0.38
    })),
    debris: Array.from({ length: debrisCount }, (_, index) => {
      const spread = 4 + (index % 4) * 1.2;
      return {
        position: [
          scene.entrance.position[0] + (random() - 0.5) * spread,
          0.18 + random() * 0.38,
          scene.entrance.position[2] + (random() - 0.5) * spread
        ],
        scale: [0.55 + random() * 1.45, 0.24 + random() * 0.55, 0.4 + random() * 1.15],
        yawRad: random() * Math.PI
      };
    }),
    overgrowth: Array.from({ length: overgrowthCount }, (_, index) => {
      const facade = index % 3 === 0 ? frontFacade : presentationFacades[index % presentationFacades.length];
      const along = random() - 0.5;
      return {
        position: [
          facade.midpoint.x + (facade.end.x - facade.start.x) * along + Math.sin(facade.yawRad) * 2.5,
          2 + random() * 1.2,
          facade.midpoint.z + (facade.end.z - facade.start.z) * along + Math.cos(facade.yawRad) * 2.5
        ],
        scale: [1.5 + random() * 1.3, 3 + random() * 2.2, 1.5 + random() * 1.3],
        yawRad: random() * Math.PI
      };
    }),
    facadeVines: Array.from({ length: vineCount }, (_, index) => {
      const window = visibleFirstWindows[index % visibleFirstWindows.length];
      return {
        position: offsetFromFacade(window, 0.5),
        scale: [1.1 + random() * 1.6, 3.5 + random() * 5.5, 0.18],
        yawRad: window.yawRad + (random() - 0.5) * 0.14
      };
    }),
    embers: Array.from({ length: Math.round(18 * settings.scorchIntensity) }, (_, index) => ({
      position: [
        (random() - 0.5) * scene.bounds.width * 0.55,
        scene.heightM + 0.9 + (index % 4) * 0.32,
        (random() - 0.5) * scene.bounds.depth * 0.55
      ],
      scale: [0.16 + random() * 0.24, 0.16 + random() * 0.3, 0.16 + random() * 0.24],
      yawRad: 0
    })),
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
