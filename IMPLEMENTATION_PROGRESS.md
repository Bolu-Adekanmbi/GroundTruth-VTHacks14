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

## Phase 4 - Evidence Capture And Generation Workflow

- Completion date: 2026-09-19
- Change summary: Replaced the static capture placeholder with a coherent curated/custom evidence workflow: editable address draft, drag/drop and file-picker uploads, JPEG/PNG/WebP validation, 8-photo/10 MB/40 MB limits, actionable upload errors, custom scene defaults with lower confidence, selectable evidence thumbnails, user-upload removal with object URL cleanup, truthful generation status steps, and reset confirmation when uploaded previews would be lost.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm run lint` - passed
  - `npm test` - passed, 23 tests
  - `npm run build` - passed
  - `npm run test:e2e` - passed, 4 Playwright tests
- Manual checks performed:
  - Inspected regenerated `test-results/phase-2-desktop-1440x900.png` after adding the capture workflow; fixed rail clipping and confirmed map/3D still dominate the workspace.
  - Inspected regenerated `test-results/phase-2-mobile-390x844.png`; confirmed mode labels, capture controls, generation status, and output sections stack without horizontal scroll.
  - Confirmed custom uploads are represented as session-only `user-upload` evidence with object URLs, not server calls.
  - Confirmed copy distinguishes curated traits as `Seeded from curated example` and custom traits as `Best-effort defaults; review required`.
  - Confirmed generation steps mark available curated stages complete and later custom GIS/footprint stages pending instead of fake-successful.
- Known limitations or deferred items:
  - Custom scene coordinates and manual rectangle are temporary low-confidence placeholders until map/geocoding/footprint work begins in Phases 5 and 6.
  - Uploads remain browser-session-only and disappear on refresh by design.
  - Reordering evidence is not implemented in this phase; evidence can be selected and user-uploaded photos can be removed.
  - Map and 3D remain placeholders until Phases 5 and 7.
  - Playwright/localhost checks required running outside the sandbox with approval.
- Suggested commit message: `phase-4: add evidence capture workflow`

## Phase 5 - Deterministic GIS Map And Footprints

- Completion date: 2026-09-19
- Change summary: Added MapLibre via `react-map-gl/maplibre`, a configurable OpenStreetMap raster basemap with visible attribution, lazy-loaded GIS map rendering, canonical footprint GeoJSON source/layers, centroid marker, north/orientation controls, metric scale, live coordinate readout, compact tile-failure warning, footprint/source/confidence metadata in the output inspector, and pure shared geometry utilities for bounds, centroid, dimensions, bearing normalization, and local-meter conversion.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm run lint` - passed
  - `npm test` - passed, 27 tests
  - `npm run build` - passed
  - `npm run test:e2e` - passed, 5 Playwright tests
- Manual checks performed:
  - Inspected `test-results/phase-5-desktop-1440x900.png`; confirmed basemap, canonical footprint layer, centroid marker, controls, OpenStreetMap attribution, coordinate readout, and output GIS metadata are visible.
  - Inspected `test-results/phase-5-mobile-390x844.png`; confirmed the mobile Map tab has no horizontal scroll, map controls fit, attribution remains visible, and the canonical footprint layer is readable.
  - Verified sample-switch e2e flow updates GIS centroid text and curated footprint dimensions from Burruss Hall to Willard Building.
  - Confirmed the map is lazy-loaded with a stable same-size fallback so the workspace does not jump while MapLibre loads.
- Known limitations or deferred items:
  - Footprints are rendered only as MapLibre GeoJSON layers from curated canonical geometry; live geocoding, live footprint lookup, and manual geometry placement begin in Phase 6.
  - The selected no-key OpenStreetMap tile source is suitable for light demo use with visible attribution, but heavy/public production traffic should use a dedicated tile provider or configured `VITE_MAP_STYLE_URL`.
  - `npm install` still reports 2 moderate transitive audit findings; no forced dependency upgrade was applied in Phase 5.
  - Playwright/localhost checks required running outside the sandbox with approval.
- Suggested commit message: `phase-5: add deterministic GIS map`

## Phase 6 - Geocoding, Footprint Fallbacks, And Manual Placement

- Completion date: 2026-09-19
- Change summary: Added GIS adapter contracts and `/api/geocode` plus `/api/footprint` routes with curated-first resolution, optional opt-in Nominatim/Overpass live lookups, request timeouts, session caching, identifying headers, and deterministic manual rectangle fallback. Added canonical footprint transform utilities for rectangle generation, nudge, rotate, and scale. Added manual GIS controls for latitude/longitude, width/depth, bearing, nudge, rotate, scale, click-to-place map interaction, source/confidence updates, `manual-corrected` state, and facade/viewpoint orientation metadata for later 3D generation.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm run lint` - passed
  - `npm test` - passed, 32 tests
  - `npm run build` - passed
  - `npm run test:e2e` - passed, 6 Playwright tests
- Manual checks performed:
  - Inspected `test-results/phase-6-desktop-1440x900.png`; confirmed manual GIS controls fit in the capture rail, the footprint remains visible on the map, and output metadata exposes source, centroid, dimensions, bearing, front facade, and confidence.
  - Inspected `test-results/phase-6-mobile-390x844.png`; confirmed controls, map, output metadata, and provenance stack without horizontal scroll.
  - Verified the e2e manual-correction flow updates source state from `Manual Rectangle` to `Manual Corrected` and preserves facade bearing metadata.
  - Verified curated addresses remain deterministic/offline in adapter tests and unknown addresses fall back to manual placement when live GIS is disabled.
- Known limitations or deferred items:
  - Live GIS calls are disabled unless `GROUNDTRUTH_ENABLE_LIVE_GIS=true`; public provider policies require conservative rate limits, identifying headers, attribution, and caching.
  - OSM/Overpass geometry parsing is intentionally minimal for the hackathon demo and should be expanded before production use.
  - Vertex dragging is deferred; the implemented correction surface covers click-to-place, numeric controls, nudge, rotate, and scale.
  - 3D generation from corrected footprints begins in Phase 7.
  - Playwright/localhost checks required running outside the sandbox with approval.
- Suggested commit message: `phase-6: add manual gis correction`

## Phase 7 - Procedural Base-Building Renderer

- Completion date: 2026-09-19
- Change summary: Added a lazy-loaded React Three Fiber base-building viewport driven by a pure, deterministic local-meter scene-plan layer. Canonical and manually corrected footprint rings now extrude into building masses with facade rhythm, instanced windows, entrance placement, flat/gable roofs, material families, ground grid, north/scale cues, lighting, shadows, bounded orbit controls, and icon-driven Reset view/Fit building actions. Facade-bearing metadata selects the photo-facing facade independently of map north. The viewport preserves its camera during ordinary state changes and only refits on scene selection or explicit command; browsers without WebGL retain a clear fallback while map and metadata remain usable.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm run lint` - passed
  - `npm test` - passed, 35 tests
  - `npm run build` - passed
  - `npm run test:e2e` - passed, 7 Playwright tests
- Manual checks performed:
  - Inspected `test-results/phase-7-desktop-1440x900.png` and `test-results/phase-7-mobile-390x844.png`; confirmed the 3D workspace is framed in the initial visible area, mobile 3D tab renders without horizontal scroll, and the central canvas is not obscured by the rails.
  - Inspected visual regression baselines for Burruss Hall and Willard Building. Burruss renders as a broad stepped, flat-roof institutional mass; Willard renders as a smaller rectangular gable-roof academic mass.
  - Verified Playwright canvas screenshot assertions for both curated samples, camera Reset view/Fit building actions, and the responsive mobile viewport path.
- Known limitations or deferred items:
  - Gable treatment is intentionally bounded to a stable ridge treatment; hip roofs and richer facade styling remain out of scope unless Phase 8 trait editing makes them necessary.
  - Phase 7 includes only the clean Base geometry. Scorched Nebraska transformations begin in Phase 9, and Disaster overlays begin in Phase 11.
  - Vite reports expected large lazy chunks for MapLibre and the Three.js viewport. They are isolated through dynamic imports; further bundle tuning belongs in Phase 13 performance polish.
  - `npm install` continues to report 2 moderate transitive audit findings; no forced dependency upgrade was applied.
  - Playwright/localhost checks required running outside the sandbox with approval.
- Suggested commit message: `phase-7: add procedural base renderer`
