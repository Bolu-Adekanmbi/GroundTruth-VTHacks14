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

  it("keeps material family selection deterministic", () => {
    expect(getMaterialColor("brick")).toBe("#8f4f3f");
    expect(getMaterialColor("concrete")).toBe("#b7b1a4");
  });
});
