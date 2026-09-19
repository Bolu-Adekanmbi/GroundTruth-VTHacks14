import { Router } from "express";
import {
  apiFailureSchema,
  footprintRequestSchema,
  footprintResponseSchema,
  geocodeRequestSchema,
  geocodeResponseSchema
} from "../../shared/api-schema.js";
import { geocodeAddress, lookupFootprint, searchLocations } from "../services/gis-adapters.js";

export const gisRouter = Router();

gisRouter.get("/geocode/suggest", async (request, response) => {
  const query = typeof request.query.q === "string" ? request.query.q : "";
  response.json({ ok: true, data: await searchLocations(query) });
});

gisRouter.post("/geocode", async (request, response) => {
  const parsed = geocodeRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json(
      apiFailureSchema.parse({
        ok: false,
        error: {
          code: "INVALID_GEOCODE_REQUEST",
          message: "Provide a non-empty address.",
          retryable: false
        }
      })
    );
    return;
  }

  const payload = await geocodeAddress(parsed.data.address);

  if (!payload.result) {
    response.status(422).json(
      apiFailureSchema.parse({
        ok: false,
        error: {
          code: "GEOCODE_REQUIRES_MANUAL_PLACEMENT",
          message: payload.warnings[0] ?? "Location could not be resolved automatically.",
          retryable: true
        }
      })
    );
    return;
  }

  response.status(200).json(
    geocodeResponseSchema.parse({
      ok: true,
      data: payload.result,
      source: payload.source,
      warnings: payload.warnings
    })
  );
});

gisRouter.post("/footprint", async (request, response) => {
  const parsed = footprintRequestSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json(
      apiFailureSchema.parse({
        ok: false,
        error: {
          code: "INVALID_FOOTPRINT_REQUEST",
          message: "Provide longitude, latitude, and positive footprint dimensions.",
          retryable: false
        }
      })
    );
    return;
  }

  const payload = await lookupFootprint(parsed.data);

  response.status(200).json(
    footprintResponseSchema.parse({
      ok: true,
      data: payload.result,
      source: payload.source,
      warnings: payload.warnings
    })
  );
});
