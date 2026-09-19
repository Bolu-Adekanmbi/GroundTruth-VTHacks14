import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { demoScenesRouter } from "./routes/demo-scenes.js";
import { gisRouter } from "./routes/gis.js";
import { getHealthResponse } from "./routes/health.js";

const clientDistPath = path.resolve(process.cwd(), "dist");

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_request, response) => {
    response.status(200).json(getHealthResponse());
  });
  app.use("/api/demo-scenes", demoScenesRouter);
  app.use("/api", gisRouter);

  if (existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get(/^\/(?!api).*/, (_request, response) => {
      response.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  return app;
}
