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
    expect(first.outline).toHaveLength(8);
    expect(first.bounds.width).toBeGreaterThan(100);
    expect(first.heightM).toBe(30);
    expect(first.windows.length).toBeGreaterThan(20);
  });

  it("uses the marked facade bearing instead of map north for photo-facing details", () => {
    const project = demoProject("willard-building");
    project.footprint.facadeOrientation = { frontBearingDeg: 90 };
    const plan = buildScenePlan(project);

    expect(plan.facades[plan.frontFacadeIndex].normalBearingDeg).toBeCloseTo(90, 0);
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
  });
});
