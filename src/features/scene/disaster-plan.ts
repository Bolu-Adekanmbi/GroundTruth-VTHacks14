import type { SceneProject } from "../../../shared/scene-schema";
import type { ScenePlan } from "./scene-plan";

export interface DisasterOverlay {
  position: [number, number, number];
  scale: [number, number, number];
  yawRad: number;
  type: "access-blocked" | "hazard-zone" | "damage-roof" | "damage-facade";
}

export interface DisasterPlan {
  overlays: DisasterOverlay[];
  hazardZone: {
    active: boolean;
    type: string;
    intensity: number;
  };
  accessStatus: "open" | "limited" | "blocked" | "unknown";
  operational: {
    summary: string;
    damageType: string;
    severity: number;
  };
}

export function buildDisasterPlan(project: SceneProject, scene: ScenePlan): DisasterPlan {
  const settings = project.scenario.disaster;
  const overlays: DisasterOverlay[] = [];

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

  return {
    overlays,
    hazardZone: {
      active: hasHazards && settings.severity > 0.1,
      type: settings.damageType,
      intensity: settings.severity
    },
    accessStatus: settings.accessStatus,
    operational: {
      summary: settings.responderNote || createResponderSummary(settings),
      damageType: settings.damageType,
      severity: settings.severity
    }
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
