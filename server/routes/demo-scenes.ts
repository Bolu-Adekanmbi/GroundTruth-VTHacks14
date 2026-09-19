import { Router } from "express";
import {
  apiFailureSchema,
  demoSceneResponseSchema,
  demoScenesResponseSchema
} from "../../shared/api-schema.js";
import { getDemoSceneById, getDemoSceneSummaries } from "../../shared/demo-scenes.js";

export function getDemoScenesResponse() {
  return demoScenesResponseSchema.parse({
    ok: true,
    data: getDemoSceneSummaries(),
    source: "curated",
    warnings: []
  });
}

export function getDemoSceneResponse(id: string) {
  const scene = getDemoSceneById(id);

  if (!scene) {
    return apiFailureSchema.parse({
      ok: false,
      error: {
        code: "DEMO_SCENE_NOT_FOUND",
        message: `No curated demo scene exists for id "${id}".`,
        retryable: false
      }
    });
  }

  return demoSceneResponseSchema.parse({
    ok: true,
    data: scene,
    source: "curated",
    warnings: []
  });
}

export const demoScenesRouter = Router();

demoScenesRouter.get("/", (_request, response) => {
  response.status(200).json(getDemoScenesResponse());
});

demoScenesRouter.get("/:id", (request, response) => {
  const payload = getDemoSceneResponse(request.params.id);

  response.status(payload.ok ? 200 : 404).json(payload);
});
