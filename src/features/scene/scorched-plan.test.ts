import { describe, expect, it } from "vitest";
import { getDemoSceneById } from "../../../shared/demo-scenes";
import { buildScenePlan } from "./scene-plan";
import { buildScorchedPlan } from "./scorched-plan";

const project = getDemoSceneById("burruss-hall")!;

describe("buildScorchedPlan", () => {
  it("is deterministic for an unchanged project", () => {
    const scene = buildScenePlan(project);
    expect(buildScorchedPlan(project, scene)).toEqual(buildScorchedPlan(project, scene));
  });

  it("adds more treatment at higher settings", () => {
    const scene = buildScenePlan(project);
    const low = buildScorchedPlan({ ...project, scenario: { ...project.scenario, scorched: { ...project.scenario.scorched, decayIntensity: 0.1, scorchIntensity: 0.1, overgrowthIntensity: 0.1, boardedWindowRatio: 0.1, debrisDensity: 0.1 } } }, scene);
    const high = buildScorchedPlan({ ...project, scenario: { ...project.scenario, scorched: { ...project.scenario.scorched, decayIntensity: 0.9, scorchIntensity: 0.9, overgrowthIntensity: 0.9, boardedWindowRatio: 0.9, debrisDensity: 0.9 } } }, scene);

    expect(high.boardedWindows.length).toBeGreaterThan(low.boardedWindows.length);
    expect(high.scorchPatches.length).toBeGreaterThan(low.scorchPatches.length);
    expect(high.roofDamage.length).toBeGreaterThan(low.roofDamage.length);
    expect(high.debris.length).toBeGreaterThan(low.debris.length);
    expect(high.overgrowth.length).toBeGreaterThan(low.overgrowth.length);
  });
});
