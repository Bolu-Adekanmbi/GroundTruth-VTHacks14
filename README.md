# GroundTruth

GroundTruth is a TypeScript React and Express application for turning field evidence into a geolocated scene workflow. Phase 1 provides the runtime foundation, health endpoint, production server, and quality checks.

## Requirements

- Node.js 24 or newer
- npm 11 or newer

## Development

```bash
npm install
npm run dev
```

The Vite client runs at `http://localhost:5173` and proxies `/api` to the Express server on `http://localhost:8787`.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

## Production

```bash
npm run build
npm start
```

The production Express process serves the built Vite client and `/api/*` routes from one Node service.

## Environment

Copy `.env.example` to `.env` when optional integrations are added. Phase 1 does not require any secrets or live service keys.
