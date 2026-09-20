import { describe, expect, it } from "vitest";
import { getDemoSceneById } from "../../../shared/demo-scenes";
import { buildScenePlan } from "./scene-plan";
import { buildDisasterPlan } from "./disaster-plan";

const project = getDemoSceneById("burruss-hall")!;

describe("buildDisasterPlan", () => {
  it("generates a deterministic plan for the same project", () => {
    const scene = buildScenePlan(project);
    expect(buildDisasterPlan(project, scene)).toEqual(buildDisasterPlan(project, scene));
  });

  it("creates access-blocked overlays when accessStatus is blocked", () => {
    const scene = buildScenePlan(project);
    const blockedProject = {
      ...project,
      scenario: {
        ...project.scenario,
        disaster: {
          status: "simulated" as const,
          damageType: "none" as const,
          severity: 0,
          accessStatus: "blocked" as const,
          hazards: [],
          responderNote: ""
        }
      }
    };
    const plan = buildDisasterPlan(blockedProject, scene);
    const blockedOverlays = plan.overlays.filter((o) => o.type === "access-blocked");
    expect(blockedOverlays.length).toBeGreaterThan(0);
  });

  it("creates no damage overlays when damageType is none", () => {
    const scene = buildScenePlan(project);
    const noDamageProject = {
      ...project,
      scenario: {
        ...project.scenario,
        disaster: {
          status: "simulated" as const,
          damageType: "none" as const,
          severity: 0,
          accessStatus: "unknown" as const,
          hazards: [],
          responderNote: ""
        }
      }
    };
    const plan = buildDisasterPlan(noDamageProject, scene);
    expect(plan.overlays.length).toBe(0);
  });

  it("increases damage overlays with higher severity", () => {
    const scene = buildScenePlan(project);
    const lowSeverity = buildDisasterPlan(
      {
        ...project,
        scenario: {
          ...project.scenario,
          disaster: {
            status: "simulated" as const,
            damageType: "fire" as const,
            severity: 0.2,
            accessStatus: "unknown" as const,
            hazards: [],
            responderNote: ""
          }
        }
      },
      scene
    );
    const highSeverity = buildDisasterPlan(
      {
        ...project,
        scenario: {
          ...project.scenario,
          disaster: {
            status: "simulated" as const,
            damageType: "fire" as const,
            severity: 0.8,
            accessStatus: "unknown" as const,
            hazards: [],
            responderNote: ""
          }
        }
      },
      scene
    );
    expect(highSeverity.overlays.length).toBeGreaterThan(lowSeverity.overlays.length);
    expect(highSeverity.simulatedDamage.fireScorch.length).toBeGreaterThan(lowSeverity.simulatedDamage.fireScorch.length);
  });

  it.each(["flood", "wind", "structural"] as const)("builds a distinct %s damage treatment", (damageType) => {
    const scene = buildScenePlan(project);
    const plan = buildDisasterPlan({
      ...project,
      scenario: {
        ...project.scenario,
        disaster: { ...project.scenario.disaster, damageType, severity: 0.72 }
      }
    }, scene);

    if (damageType === "flood") {
      expect(plan.simulatedDamage.floodWater).not.toBeNull();
      expect(plan.simulatedDamage.floodStains.length).toBeGreaterThan(0);
    }
    if (damageType === "wind") expect(plan.simulatedDamage.windPanels.length).toBeGreaterThan(0);
    if (damageType === "structural") {
      expect(plan.simulatedDamage.structuralCracks.length).toBeGreaterThan(0);
      expect(plan.simulatedDamage.structuralBraces.length).toBeGreaterThan(0);
    }
  });

  it("includes hazard zone information when hazards are present", () => {
    const scene = buildScenePlan(project);
    const hazardProject = {
      ...project,
      scenario: {
        ...project.scenario,
        disaster: {
          status: "simulated" as const,
          damageType: "none" as const,
          severity: 0.5,
          accessStatus: "unknown" as const,
          hazards: ["unstable roof", "debris field"],
          responderNote: ""
        }
      }
    };
    const plan = buildDisasterPlan(hazardProject, scene);
    expect(plan.hazardZone.active).toBe(true);
    expect(plan.hazardZone.intensity).toBe(0.5);
  });

  it("preserves disaster status and operational summary", () => {
    const scene = buildScenePlan(project);
    const note = "Test responder note";
    const statusProject = {
      ...project,
      scenario: {
        ...project.scenario,
        disaster: {
          status: "observed" as const,
          damageType: "none" as const,
          severity: 0,
          accessStatus: "open" as const,
          hazards: [],
          responderNote: note
        }
      }
    };
    const plan = buildDisasterPlan(statusProject, scene);
    expect(plan.accessStatus).toBe("open"); // Curated scene default
    expect(plan.operational.summary).toBe(note);
  });
});
