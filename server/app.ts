import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { demoScenesRouter } from "./routes/demo-scenes.js";
import { gisRouter } from "./routes/gis.js";
import { getHealthResponse } from "./routes/health.js";
import { traitsRouter } from "./routes/traits.js";
import { visionRouter } from "./routes/vision.js";

const clientDistPath = path.resolve(process.cwd(), "dist");

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "6mb" }));

  app.get("/api/health", (_request, response) => {
    response.status(200).json(getHealthResponse());
  });
  app.use("/api/demo-scenes", demoScenesRouter);
  app.use("/api", gisRouter);
  app.use("/api", traitsRouter);
  app.use("/api/vision", visionRouter);

  if (existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get(/^\/(?!api).*/, (_request, response) => {
      response.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  return app;
}
