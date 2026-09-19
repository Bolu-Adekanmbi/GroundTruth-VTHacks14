# Implementation Progress

This log records completed implementation phases. It does not authorize starting the next phase.

## Phase 1 - Repository And Runtime Foundation

- Completion date: 2026-09-19
- Change summary: Scaffolded a root-level React + Vite + TypeScript client, Express server, shared Zod health schema, Vite API proxy, production static serving, strict TypeScript projects, ESLint, Vitest, Playwright, `.env.example`, README, and npm scripts. Replaced `Hello world.txt` with the application scaffold while preserving `LICENSE`.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm run lint` - passed
  - `npm test` - passed, 2 tests
  - `npm run build` - passed
  - `npm run test:e2e` - passed, 1 Playwright test
- Manual checks performed:
  - `npm run dev` started Vite on `http://localhost:5173` and Express on `http://localhost:8787`.
  - `npm start` served the production build after `npm run build`.
  - `curl -i http://localhost:8787/api/health` returned HTTP 200 with the required validated health envelope.
  - `curl -i http://localhost:8787/` returned HTTP 200 and the built SPA entry.
- Known limitations or deferred items:
  - The placeholder is intentionally minimal; Phase 2 owns the GroundTruth workspace shell and visual design.
  - `npm install` reports 2 moderate audit findings in transitive dependencies. No forced dependency upgrade was applied in Phase 1 to avoid expanding scope.
  - Local sandbox networking cannot share dev-server ports across separate sandboxed commands, so browser/e2e and HTTP smoke checks were run outside the sandbox with approval.
- Suggested commit message: `phase-1: scaffold runtime foundation`

## Phase 2 - Design System And Workspace Shell

- Completion date: 2026-09-19
- Change summary: Added local IBM Plex Sans/Mono font loading, Lucide icons, CSS token/reset/global files, focused UI primitives, a responsive GroundTruth workspace shell, compact header/status bar, Base/Scorched Nebraska/Disaster Response mode control, left capture-and-traits rail, central map/3D split workspace, right evidence-and-output rail, mobile Map/3D tabs, and truthful Phase 5/Phase 7 viewport placeholders.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm run lint` - passed
  - `npm test` - passed, 4 tests
  - `npm run build` - passed
  - `npm run test:e2e` - passed, 4 Playwright tests
- Manual checks performed:
  - Inspected `test-results/phase-2-desktop-1440x900.png`.
  - Inspected `test-results/phase-2-laptop-1280x720.png`.
  - Inspected `test-results/phase-2-mobile-390x844.png`.
  - Confirmed mode labels fit at required screenshot sizes, side rails do not obscure the center workspace, mobile has no horizontal scroll, selected controls remain visually stable, focus styling is defined, typography remains compact, and the workspace dominates the desktop view.
  - Scanned source styles for prohibited gradient/orb/hero/glass treatments; none remained.
- Known limitations or deferred items:
  - Map and 3D panels are explicit development placeholders until Phases 5 and 7.
  - Placeholder evidence, traits, provenance, and export rows are realistic static shell content until Phase 3 connects canonical scene data.
  - `npm install` still reports 2 moderate transitive audit findings; no forced dependency upgrade was applied in Phase 2 to avoid expanding scope.
  - Playwright/localhost checks required running outside the sandbox with approval.
- Suggested commit message: `phase-2: build responsive workspace shell`

## Phase 3 - Canonical Data Model And Curated Catalog

- Completion date: 2026-09-19
- Change summary: Added the canonical Zod scene model, validated API envelope schemas, two curated scene fixtures, local demo photo assets with machine-readable attribution, demo scene list/detail API routes, a Zustand scene store with selectors, store-backed catalog switching, real evidence preview/thumbnails, trait/confidence/assumption/provenance display, and fixture/API/store/UI tests.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm run lint` - passed
  - `npm test` - passed, 12 tests
  - `npm run build` - passed
  - `npm run test:e2e` - passed, 4 Playwright tests
- Manual checks performed:
  - Downloaded and verified local JPEG assets at 960px width: `public/demo-assets/burruss-hall/burruss-hall.jpg` and `public/demo-assets/willard-building/willard-building-east.jpg`.
  - Inspected regenerated desktop and mobile screenshots after wiring real evidence.
  - Verified `GET /api/demo-scenes` over HTTP returned `200 true burruss-hall,willard-building`.
  - Verified `GET /api/demo-scenes/burruss-hall` over HTTP returned `200 true burruss-hall CC BY-SA 2.0`.
  - Verified `GET /api/demo-scenes/not-real` over HTTP returned `404 false DEMO_SCENE_NOT_FOUND false`.
  - Confirmed sample switching updates project identity, address, evidence, traits, confidence, assumptions, footprint dimensions, and source/provenance labels through the scene store.
- Known limitations or deferred items:
  - Each curated sample currently has one source photo; upload and richer evidence workflows begin in Phase 4.
  - Map and 3D remain placeholders until Phases 5 and 7.
  - Footprints are curated seed polygons intended to exercise schema and UI wiring; live GIS footprint lookup is deferred.
  - `npm install` still reports 2 moderate transitive audit findings; no forced dependency upgrade was applied in Phase 3.
  - Playwright/localhost checks required running outside the sandbox with approval.
- Suggested commit message: `phase-3: add canonical scene catalog`
