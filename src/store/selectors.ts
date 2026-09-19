import type { SceneProject } from "../../shared/scene-schema";

export const selectCatalog = (state: { catalog: SceneProject[] }) => state.catalog;

export const selectActiveProject = (state: { activeProject: SceneProject }) => state.activeProject;
