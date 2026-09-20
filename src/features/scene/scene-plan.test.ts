import { describe, expect, it } from "vitest";
import { getDemoSceneById } from "../../../shared/demo-scenes";
import { buildScenePlan, getMaterialColor } from "./scene-plan";

function demoProject(id: string) {
  const project = getDemoSceneById(id);
  if (!project) {
    throw new Error(`Missing demo project: ${id}`);
  }
  return structuredClone(project);
}

describe("buildScenePlan", () => {
  it("converts a canonical footprint into stable local render parameters", () => {
    const project = demoProject("burruss-hall");
    const first = buildScenePlan(project);
    const second = buildScenePlan(project);

    expect(first).toEqual(second);
    expect(first.outline.length).toBeGreaterThan(8);
    expect(first.bounds.width).toBeGreaterThan(100);
    expect(first.heightM).toBe(30);
    expect(first.windows.length).toBeGreaterThan(20);
  });

  it("uses the marked facade bearing instead of map north for photo-facing details", () => {
    const project = demoProject("willard-building");
    project.footprint.facadeOrientation = { frontBearingDeg: 90 };
    const plan = buildScenePlan(project);

    const selectedDistance = Math.abs(((plan.facades[plan.frontFacadeIndex].normalBearingDeg - 90 + 540) % 360) - 180);
    const nearestDistance = Math.min(...plan.facades.map((facade) => Math.abs(((facade.normalBearingDeg - 90 + 540) % 360) - 180)));

    expect(selectedDistance).toBeCloseTo(nearestDistance, 8);
    expect(plan.entrance.position[1]).toBeGreaterThan(0);
  });

  it.each(["burruss-hall", "willard-building"])("places every window directly on an outward-facing facade for %s", (id) => {
    const plan = buildScenePlan(demoProject(id));

    for (const window of plan.windows) {
      const facade = plan.facades[window.facadeIndex];
      const outward = { x: Math.sin(facade.yawRad), z: Math.cos(facade.yawRad) };
      const offset = {
        x: window.position[0] - facade.midpoint.x,
        z: window.position[2] - facade.midpoint.z
      };

      expect(offset.x * outward.x + offset.z * outward.z).toBeCloseTo(0.1, 5);
      expect(facade.midpoint.x * outward.x + facade.midpoint.z * outward.z).toBeGreaterThan(0);
    }
  });

  it("keeps material family selection deterministic", () => {
    expect(getMaterialColor("brick")).toBe("#8f4f3f");
    expect(getMaterialColor("concrete")).toBe("#b7b1a4");
    expect(getMaterialColor("brick", "#9a5b45")).toBe("#9a5b45");
  });

  it("maps a visible-facade window estimate into procedural density", () => {
    const project = demoProject("willard-building");
    project.building.windowColumns = 12;
    const plan = buildScenePlan(project);
    const frontWindows = plan.windows.filter((window) => window.facadeIndex === plan.frontFacadeIndex);

    expect(frontWindows).toHaveLength(12 * project.building.floors);
  });

  it("adds selected visible-facade modules without changing the canonical outline", () => {
    const project = demoProject("willard-building");
    const baseline = buildScenePlan(project);
    project.building.facadeModules = ["canopy", "portico"];
    const plan = buildScenePlan(project);

    expect(plan.outline).toEqual(baseline.outline);
    expect(plan.facadeModules.map((module) => module.type)).toEqual(["canopy", "portico"]);
    expect(plan.facadeModules.every((module) => module.position[1] > 0)).toBe(true);
  });

  it("derives restrained architectural details from the authoritative footprint", () => {
    const plan = buildScenePlan(demoProject("willard-building"));

    expect(plan.facadeBands).toHaveLength(plan.facades.length * (plan.floors - 1));
    expect(plan.parapetEdges).toHaveLength(plan.facades.length);
    expect(plan.entranceSteps).toHaveLength(3);
    expect(plan.entranceSteps.every((step) => step.position[1] > 0)).toBe(true);
  });
});
