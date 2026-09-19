import { createApp } from "./app.js";

const port = Number.parseInt(process.env.PORT ?? "8787", 10);
const app = createApp();

app.listen(port, () => {
  console.log(`GroundTruth API listening on http://localhost:${port}`);
});
