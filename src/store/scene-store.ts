import { create } from "zustand";
import { defaultDemoSceneId, demoScenes, getDemoSceneById } from "../../shared/demo-scenes";
import { sceneProjectSchema, type SceneMode, type SceneProject } from "../../shared/scene-schema";

interface SceneStore {
  catalog: SceneProject[];
  activeProject: SceneProject;
  loadDemoScene: (id: string) => void;
  setSceneMode: (mode: SceneMode) => void;
}

const defaultProject = sceneProjectSchema.parse(getDemoSceneById(defaultDemoSceneId));

export const useSceneStore = create<SceneStore>((set) => ({
  catalog: demoScenes,
  activeProject: defaultProject,
  loadDemoScene: (id) => {
    const scene = getDemoSceneById(id);

    if (!scene) {
      throw new Error(`Unknown demo scene id: ${id}`);
    }

    set({ activeProject: sceneProjectSchema.parse(scene) });
  },
  setSceneMode: (mode) => {
    set((state) => ({
      activeProject: sceneProjectSchema.parse({
        ...state.activeProject,
        scenario: {
          ...state.activeProject.scenario,
          activeMode: mode
        }
      })
    }));
  }
}));
