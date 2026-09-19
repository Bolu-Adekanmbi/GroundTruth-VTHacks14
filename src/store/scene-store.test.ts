import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useSceneStore } from "./scene-store";

describe("scene store", () => {
  it("loads a curated demo scene through a validated action", () => {
    const { result } = renderHook(() => useSceneStore());

    act(() => result.current.loadDemoScene("willard-building"));

    expect(result.current.activeProject.id).toBe("willard-building");
    expect(result.current.activeProject.name).toBe("Willard Building");
    expect(result.current.activeProject.evidence[0].attribution.license).toBe("CC0 1.0");
  });

  it("preserves the active project while changing scene mode", () => {
    const { result } = renderHook(() => useSceneStore());

    act(() => result.current.loadDemoScene("burruss-hall"));
    act(() => result.current.setSceneMode("scorched"));

    expect(result.current.activeProject.id).toBe("burruss-hall");
    expect(result.current.activeProject.scenario.activeMode).toBe("scorched");
  });
});
