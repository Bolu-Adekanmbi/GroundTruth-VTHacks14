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
  - Rotated footprint rendering can misalign facade windows and roof treatments relative to the map footprint. The user chose to defer this Phase 7 coordinate-basis correction in favor of completing the end-to-end demo; do not present rotated/manual footprints as spatially aligned until it is repaired.
  - Phase 7 includes only the clean Base geometry. Scorched Nebraska transformations begin in Phase 9, and Disaster overlays begin in Phase 11.
  - Vite reports expected large lazy chunks for MapLibre and the Three.js viewport. They are isolated through dynamic imports; further bundle tuning belongs in Phase 13 performance polish.
  - `npm install` continues to report 2 moderate transitive audit findings; no forced dependency upgrade was applied.
  - Playwright/localhost checks required running outside the sandbox with approval.
- Suggested commit message: `phase-7: add procedural base renderer`

## Phase 8 - Trait Editing, Provenance, And Shared-State Integration

- Completion date: 2026-09-19
- Change summary: Replaced the read-only trait list with compact canonical controls for building type, floors, height, material, roof, window pattern, and entrance. Added row-level trait reset, whole-scene reset, per-trait manual provenance, explicit seeded/assumed/manual labels, confidence labels with numeric values, linked assumption paths, and truthful `scene-ready` versus `review-required` status. Added a schema-validated `/api/extract-traits` route that returns curated seeded traits or conservative custom defaults without claiming model inference.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm run lint` - passed
  - `npm test` - passed, 39 tests
  - `npm run build` - passed
  - `npm run test:e2e` - passed, 8 Playwright tests
- Manual checks performed:
  - Inspected `test-results/phase-8-desktop-1440x900.png` and `test-results/phase-8-mobile-390x844.png`; confirmed compact controls, reset actions, provenance paths, confidence wording, and the mobile 3D tab fit without horizontal scroll.
  - Verified `POST /api/extract-traits` for Burruss Hall returns seeded traits, `0.84` trait confidence, and the `Rear facade not represented in evidence.` warning.
  - Verified trait edits survive mode switching and reset to the selected seeded record through unit, component, and Playwright coverage.
- Known limitations or deferred items:
  - The user-directed deferred rotated-footprint renderer alignment issue remains from Phase 7; trait edits are canonical but rotated map/3D spatial alignment still needs a focused coordinate-basis repair.
  - Custom trait extraction intentionally remains conservative defaults. No vision-model claim is made.
  - Scorched Nebraska visuals remain deferred to Phase 9; this phase completes only the Base workflow.
  - Vite continues to report expected large lazy chunks for MapLibre and Three.js. Bundle tuning belongs in Phase 13.
- Suggested commit message: `phase-8: add trait editing and provenance`

## Phase 9 - Scorched Nebraska Transformation

- Completion date: 2026-09-19
- Change summary: Added a deterministic, local procedural Scorched Nebraska layer around the unchanged Base asset. The scene now darkens and roughens facades, darkens/breaks windows, applies seeded boarded-window meshes and scorch patches, and adds bounded debris and overgrowth. Added compact scenario controls for decay, scorch, overgrowth, boarded-window ratio, debris density, and gameplay tags. Generated gameplay attributes are visibly labeled and stored as simulated scenario provenance; they do not alter evidence-backed Base traits or normal-photo claims.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm run lint` - passed
  - `npm test` - passed, 43 tests
  - `npm run build` - passed
  - `npm run test:e2e -- --update-snapshots` - passed, 9 Playwright tests; added a Scorched Burruss canvas baseline
- Manual checks performed:
  - Inspected the Base and Scorched Burruss canvas baselines at the same camera. The building silhouette and camera remain stable while the Scorched scene has visibly darkened windows/facade, boarded windows, and procedural degradation.
  - Verified the Scorched inspector exposes all five numeric controls, gameplay tags, and generated gameplay metadata without presenting those values as observed evidence.
  - Verified unit coverage at low/high settings increases boards, scorch patches, debris, and vegetation while unchanged inputs produce exactly the same transform plan.
  - Verified Scorched controls retain their values when switching Base -> Scorched and reset to the selected seeded settings with the existing reset action.
- Known limitations or deferred items:
  - The Phase 7 rotated-footprint coordinate-basis issue remains intentionally deferred. Scenario layers inherit the current Base facade/window placement and should not be represented as spatially aligned when a manual footprint has been rotated.
  - This phase intentionally uses bounded local geometry and materials rather than external image assets. Disaster Response overlays and export formats remain later phases.
  - Vite continues to report expected large lazy chunks for MapLibre and Three.js. Bundle tuning belongs in Phase 13.
  - Playwright/localhost checks required running outside the sandbox with approval.
- Suggested commit message: `phase-9: add scorched nebraska transformation`

## Phase 10 - GeoJSON And Metadata Exports

- Completion date: 2026-09-19
- Change summary: Replaced placeholder export controls with schema-validated, browser-only Blob downloads. Added pure GeoJSON and metadata builders with deterministic scene/mode filenames. GeoJSON exports canonical WGS84 footprint geometry, flat GIS-compatible/ArcGIS-ready attributes, trait-derived entrance access points where available, and a simulated generated-debris point in Scorched mode. Metadata retains the nested scene record, sanitized evidence references and attribution, timestamp/app version, and explicit scenario provenance without browser object URLs. Export failures surface a recoverable validation message.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm run lint` - passed
  - `npm test` - passed, 47 tests
  - `npm run build` - passed
  - `npm run test:e2e` - passed, 10 Playwright tests
- Manual checks performed:
  - Inspected `test-results/phase-8-desktop-1440x900.png`; confirmed the compact output inspector has clear GeoJSON and Metadata JSON download controls, GIS-compatible/ArcGIS-ready wording, and no layout collision with spatial metadata.
  - Verified fixture/golden tests validate Base and Scorched exports for both curated buildings.
  - Verified Playwright downloads both Scorched files, parses their schemas, confirms polygon coordinates and simulated generated-debris provenance, and confirms a manual floors edit is reflected in exported GeoJSON.
  - Confirmed metadata omits browser evidence object URLs and labels generated Scorched treatment as simulated rather than observed source evidence.
- Known limitations or deferred items:
  - Exports are standards-based GeoJSON and JSON, not native ArcGIS packages. They are labeled GIS-compatible and use flattened ArcGIS-ready attributes.
  - Entrance points are trait-derived approximate access points, not surveyed entrance coordinates.
  - The Phase 7 rotated-footprint coordinate-basis issue remains deferred and affects visual alignment only; the exported GeoJSON remains the canonical footprint data.
  - Vite continues to report expected large lazy chunks for MapLibre and Three.js. Bundle tuning belongs in Phase 13.
  - Playwright/localhost checks required running outside the sandbox with approval.
- Suggested commit message: `phase-10: add geojson and metadata exports`

## Phase 11 - Disaster Response Mode

- Completion date: 2026-09-19
- Change summary: Added Disaster Response as a third canonical scene mode alongside Base and Scorched Nebraska. Added controls for status, damage type, severity, access, primary-entrance block state, hazards, and an editable responder note. The app supplies a concise rule-generated responder summary until it is edited. Added deterministic 3D roof/facade/access overlays, a map operational marker, legends, and responsible caveat wording. GeoJSON and metadata now export conditional Disaster features and preserve every scenario claim (`simulated`, `observed`, `inferred`, or `unknown`) without conflating them with normal-photo evidence.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm run lint` - passed
  - `npm test` - passed, 61 tests
  - `npm run build` - passed
  - `npm run test:e2e` - passed, 14 Playwright tests
- Manual checks performed:
  - Inspected the active-condition canvas baseline `e2e/app.spec.ts-snapshots/phase-11-disaster-burruss-canvas-chromium-linux.png`; confirmed roof damage is visible at the Base camera while preserving the building/camera framing.
  - Verified the Disaster Response radio button and mode switch renders correctly in all three viewport sizes.
  - Confirmed disaster scenario controls update project state, do not mutate Scorched settings, and trigger deterministic regeneration of overlay geometries.
  - Verified export GeoJSON includes hazard_zone, access_status, and damage_assessment features with proper WGS84 coordinates and conditional inclusion based on disaster settings.
  - Verified export metadata correctly labels scenario provenance as `observed`, `simulated`, `inferred`, or `unknown`, including the current submitted status rather than stale state.
  - Confirmed access-blocked overlays render at entrance when accessStatus="blocked", damage overlays render based on damageType and severity, and hazard zones render when hazards text is present and severity > 0.1.
  - Verified determinism: identical disaster inputs produce identical DisasterPlan outputs across multiple runs.
  - Confirmed the 3D and map legends distinguish the operational overlays, and the app says that conditions require verification and are not a structural safety determination.
- Known limitations or deferred items:
  - Entrance markers are trait-derived approximate locations, not surveyed access points.
  - Disaster overlay visual styling is procedurally placed at fixed scales; fine-grained placement relative to building facade details requires coordinated Phase 7 repair of rotated-footprint alignment (deferred from Phase 7).
  - Disaster Response does not include a playable simulation or predictive hazard modeling; overlays represent user-entered or simulated conditions for field-team communication and do not claim observational or predictive authority.
  - Vite continues to report expected large lazy chunks for MapLibre and Three.js. Bundle tuning belongs in Phase 13.
  - Playwright/localhost checks required running outside the sandbox with approval.
- Suggested commit message: `phase-11: add disaster response mode`

## Phase 12 - Custom Upload Hardening And Offline Resilience

- Completion date: 2026-09-19
- Change summary: Added application, map, and 3D error boundaries with a one-action `Load demo scene` recovery path. Added a subtle online/offline status indicator, explicit map loading/failure states, browser-side timeout/cancellation for custom GIS requests, and a generation-run guard that prevents stale custom results from replacing a newer selected demo. Custom scenes now remain `review-required` until a user explicitly confirms the conservative editable traits; uploads remain session-only and are revoked on removal/reset.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm run lint` - passed
  - `npm test` - passed, 63 tests
  - `npm run build` - passed
  - `npm run test:e2e` - passed, 16 Playwright tests
- Manual checks performed:
  - Inspected `test-results/phase-8-desktop-1440x900.png`; confirmed the online status is compact and the Base workspace remains readable without control collisions.
  - Verified the focused Playwright tile-failure case renders `Basemap tiles are unavailable; footprint and GIS state remain visible.` rather than blanking the application.
  - Verified custom generation followed by an immediate demo switch cannot overwrite the selected curated scene when the stale request completes.
  - Verified curated sample switching remains usable while offline after initial load, and the custom confirmation control transitions a custom scene from review-required to ready.
- Known limitations or deferred items:
  - The no-key OSM basemap cannot render fresh tiles while offline; curated footprints, evidence, procedural scenes, metadata, and exports remain local and usable after the application has loaded.
  - Custom network resolution still depends on the optional GIS adapters; failures preserve manual placement and review-required state rather than fabricating results.
  - The Phase 7 rotated-footprint renderer alignment issue remains deferred.
  - Vite continues to report expected large lazy chunks for MapLibre and Three.js. Bundle tuning belongs in Phase 13.
  - Playwright/localhost checks required running outside the sandbox with approval.
- Suggested commit message: `phase-12: harden custom and offline workflows`

## Phase 13 - Responsive, Accessible, Visual, And Performance Polish

- Completion date: 2026-09-19
- Change summary: Removed the dead Locate footprint toolbar control, refined disabled-state and long-value wrapping behavior, and tightened narrow-screen status spacing. Preserved the existing lazy map/3D boundaries, memoized scene plans, capped canvas DPR, reduced-motion rules, and mobile Map/3D tab behavior. Added keyboard download/mode coverage, final responsive checks across five viewports, and final Base/Scorched/Disaster desktop/mobile captures.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm run lint` - passed
  - `npm test` - passed, 63 tests
  - `npm run build` - passed
  - `npm run test:e2e` - passed, 28 Playwright tests
  - Focused final screenshot capture group - passed, 6 Base/Scorched/Disaster desktop/mobile captures
- Manual checks performed:
  - Inspected `test-results/final-base-desktop.png`, `test-results/final-scorched-mobile.png`, and `test-results/final-disaster-desktop.png`; confirmed the Base model is framed, mobile Scorched controls stack without horizontal overflow, and configured Disaster overlays, marker, legend, and caveat are visible.
  - Verified required responsive paths at 1440x900, 1280x720, 1024x768, 768x1024, and 390x844 through Playwright no-horizontal-scroll checks.
  - Verified keyboard Space changes scene mode and Enter activates the focused GeoJSON download control.
  - Verified familiar Lucide icon actions retain labels/tooltips and no remaining toolbar action is inert.
  - Anti-generic design checklist: passed. The app opens directly to the GIS/3D workspace; uses a restrained multi-color operational palette; avoids hero/marketing composition, decorative gradients/orbs, nested cards, and generic dashboard filler; and keeps maps, evidence, 3D output, and dense controls as first-class working surfaces.
- Known limitations or deferred items:
  - Vite reports large lazy chunks for MapLibre and Three.js. The bundles are split by feature; deeper bundle work is deferred unless deployment profiling requires it.
  - No third-party accessibility scanner is installed; semantic labels, keyboard paths, focus-visible styling, and reduced-motion behavior were checked through component and Playwright coverage.
  - Fresh public basemap tiles remain network-dependent, with the Phase 12 local fallback state shown on failure.
  - The Phase 7 rotated-footprint renderer alignment issue remains deferred.
- Suggested commit message: `phase-13: polish responsive accessible demo`

## Phase 15A - GLB Export

- Completion date: 2026-09-19
- Change summary: Added a downloadable GLB (glTF 2.0 binary) for the active Base, Scorched Nebraska, or Disaster Response scene. The exported scene is rebuilt from the canonical procedural plans rather than captured from the viewport, so it excludes editor-only grid, ground, lights, camera controls, labels, and helpers. It contains named Building, BuildingMass, Windows, PrimaryEntrance, Roof, and scenario groups as applicable. Materials are procedural colors with no external textures, keeping every asset self-contained. Root extras document local meter scale, Y-up orientation, and the local coordinate convention.
- Automated checks and results:
  - `npm run typecheck` - passed
  - `npm test` - passed, 66 tests
  - `npm run lint` - passed
  - `npm run build` - passed
  - Focused Playwright GLB download check - passed; verified Disaster Response filename, nonempty binary payload, and `glTF` header
  - GLTFLoader round-trip test - passed; reloaded the generated GLB and verified expected building and scenario nodes
- Manual review instructions:
  - Run `npm run dev`, choose each relevant scene mode, then use **Download GLB 3D model** in Outputs.
  - Open the resulting file in an independent GLB viewer, such as the Khronos glTF Sample Viewer or a desktop GLB viewer. Confirm the building, windows, roof, and active scenario overlays are present; no editor grid, lights, or labels should appear.
  - Confirm the viewer reports or visually honors meters and Y-up orientation. The building is centered at the local origin and its world coordinate mapping is recorded in GLB extras.
- Known limitations or deferred items:
  - The GLB is a procedural demo model; it does not claim photo-accurate reconstruction or surveyed facade placement.
  - The deferred rotated-footprint renderer alignment issue from Phase 7 can also affect the procedural geometry reflected in an export.
  - An external viewer was not available in this local automation environment; the export has been validated by a binary-header check, real browser download, and independent GLTFLoader round trip. Complete the listed visual check before presenting it as externally viewer-validated.
- Suggested commit message: `phase-15a: add self-contained GLB export`
