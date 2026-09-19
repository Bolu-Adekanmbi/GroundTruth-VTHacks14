import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSceneStore } from "./scene-store";

let revokeObjectURLMock: ReturnType<typeof vi.fn>;

function imageFile(name: string, type = "image/jpeg", content = "photo") {
  return new File([content], name, { type });
}

describe("scene store", () => {
  beforeEach(() => {
    revokeObjectURLMock = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn((file: File) => `blob:test-${file.name}`)
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectURLMock
    });
    act(() => useSceneStore.getState().resetSession());
  });

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

  it("creates a lower-confidence custom scene from user evidence without using filenames as identity", () => {
    const { result } = renderHook(() => useSceneStore());

    act(() => result.current.setAddressDraft("321 Field Lab Road, Blacksburg VA"));
    act(() => result.current.addEvidenceFiles([imageFile("front-facade.jpg")]));

    expect(result.current.activeProject.id).toBe("custom-session");
    expect(result.current.activeProject.name).toBe("321 Field Lab Road, Blacksburg VA");
    expect(result.current.activeProject.evidence[0].origin).toBe("user-upload");
    expect(result.current.activeProject.evidence[0].id).toBe("custom-photo-1");
    expect(result.current.activeProject.confidence.overall).toBeLessThan(0.4);
    expect(result.current.activeProject.provenance[1].label).toBe(
      "Best-effort defaults; review required"
    );
  });

  it("preserves existing valid photos when a later upload is rejected", () => {
    const { result } = renderHook(() => useSceneStore());

    act(() => result.current.addEvidenceFiles([imageFile("front.jpg")]));
    act(() => result.current.addEvidenceFiles([imageFile("notes.pdf", "application/pdf")]));

    expect(result.current.activeProject.evidence).toHaveLength(1);
    expect(result.current.uploadErrors[0]).toBe("notes.pdf is not a JPEG, PNG, or WebP image.");
  });

  it("revokes uploaded object URLs when removing photos, switching samples, and resetting", () => {
    const { result } = renderHook(() => useSceneStore());

    act(() =>
      result.current.addEvidenceFiles([imageFile("front.jpg"), imageFile("side.jpg", "image/png")])
    );
    act(() => result.current.removeEvidencePhoto("custom-photo-1"));

    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:test-front.jpg");

    act(() => result.current.loadDemoScene("willard-building"));

    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:test-side.jpg");

    act(() => result.current.addEvidenceFiles([imageFile("new.webp", "image/webp")]));
    act(() => result.current.resetSession());

    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:test-new.webp");
    expect(result.current.activeProject.id).toBe("burruss-hall");
  });

  it("reports truthful generation steps for curated and custom inputs", async () => {
    const { result } = renderHook(() => useSceneStore());

    await act(async () => {
      await result.current.generateScene();
    });

    expect(result.current.generationSteps.every((step) => step.status === "complete")).toBe(true);
    expect(result.current.generationSteps[3].detail).toBe("Seeded from curated example");

    act(() => result.current.addEvidenceFiles([imageFile("custom.jpg")]));
    await act(async () => {
      await result.current.generateScene();
    });

    expect(result.current.generationSteps.map((step) => step.status)).toEqual([
      "complete",
      "warning",
      "warning",
      "warning"
    ]);
    expect(result.current.generationSteps[3].detail).toBe("Best-effort defaults; review required");
  });
});
