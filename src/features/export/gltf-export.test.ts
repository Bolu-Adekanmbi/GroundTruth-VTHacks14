import { describe, expect, it } from "vitest";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { getDemoSceneById } from "../../../shared/demo-scenes";
import { buildGlbExport, buildGlbScene, getGlbFilename } from "./gltf-export";

describe("GLB export", () => {
  it("builds a clean, named base scene with meter-scale metadata", () => {
    const project = getDemoSceneById("burruss-hall")!;
    const scene = buildGlbScene(project);
    const building = scene.getObjectByName("Building");

    expect(scene.userData).toMatchObject({ units: "meters", up_axis: "Y", scenario_mode: "base" });
    expect(building?.getObjectByName("BuildingMass")).toBeDefined();
    expect(building?.getObjectByName("Windows")).toBeDefined();
    expect(building?.getObjectByName("PrimaryEntrance")).toBeDefined();
    expect(building?.getObjectByName("Roof")).toBeDefined();
    expect(scene.getObjectByName("Grid")).toBeUndefined();
    expect(getGlbFilename(project)).toBe("groundtruth-burruss-hall-base.glb");
  });

  it("produces a nonempty GLB with scenario-specific named nodes", async () => {
    const base = getDemoSceneById("willard-building")!;
    const project = { ...base, scenario: { ...base.scenario, activeMode: "scorched" as const } };
    const scene = buildGlbScene(project);
    const binary = await buildGlbExport(project);
    const header = new Uint8Array(binary.slice(0, 4));
    const loaded = await new GLTFLoader().parseAsync(binary, "");

    expect(scene.getObjectByName("ScorchedScenario")).toBeDefined();
    expect(binary.byteLength).toBeGreaterThan(1_000);
    expect([...header]).toEqual([0x67, 0x6c, 0x54, 0x46]);
    expect(loaded.scene.getObjectByName("BuildingMass")).toBeDefined();
    expect(loaded.scene.getObjectByName("ScorchedScenario")).toBeDefined();
  });
});
