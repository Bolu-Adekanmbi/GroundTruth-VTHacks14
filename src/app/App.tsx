import { useState } from "react";
import {
  Activity,
  Box,
  Camera,
  Download,
  ExternalLink,
  Layers,
  LocateFixed,
  MapPin,
  Maximize2,
  RotateCcw,
  Upload
} from "lucide-react";
import type { BuildingTraits, SceneMode } from "../../shared/scene-schema";
import { Button } from "../components/ui/Button";
import { FieldWrapper } from "../components/ui/FieldWrapper";
import { IconButton } from "../components/ui/IconButton";
import { SectionHeader } from "../components/ui/SectionHeader";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { StatusIndicator } from "../components/ui/StatusIndicator";
import { Tooltip } from "../components/ui/Tooltip";
import { selectActiveProject, selectCatalog } from "../store/selectors";
import { useSceneStore } from "../store/scene-store";

type ViewportMode = "map" | "scene";

const sceneModeOptions = [
  { value: "base", label: "Base" },
  { value: "scorched", label: "Scorched Nebraska" },
  { value: "disaster", label: "Disaster Response" }
] satisfies Array<{ value: SceneMode; label: string }>;

const viewportOptions = [
  { value: "map", label: "Map" },
  { value: "scene", label: "3D" }
] satisfies Array<{ value: ViewportMode; label: string }>;

const traitRows: Array<{
  key: keyof BuildingTraits;
  label: string;
  source: "Observed" | "Seeded" | "Assumed";
  format?: (value: BuildingTraits[keyof BuildingTraits]) => string;
}> = [
  { key: "buildingType", label: "Building type", source: "Seeded", format: formatLabel },
  { key: "floors", label: "Floors", source: "Assumed", format: String },
  { key: "heightM", label: "Height", source: "Assumed", format: (value) => `${String(value)} m` },
  { key: "material", label: "Material", source: "Observed", format: formatLabel },
  { key: "roofType", label: "Roof type", source: "Seeded", format: formatLabel },
  { key: "entrancePosition", label: "Entrance", source: "Assumed", format: formatLabel }
];

function formatLabel(value: unknown) {
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function App() {
  const catalog = useSceneStore(selectCatalog);
  const activeProject = useSceneStore(selectActiveProject);
  const loadDemoScene = useSceneStore((state) => state.loadDemoScene);
  const setSceneMode = useSceneStore((state) => state.setSceneMode);
  const [viewportMode, setViewportMode] = useState<ViewportMode>("map");
  const sceneMode = activeProject.scenario.activeMode;
  const selectedEvidence = activeProject.evidence[0];
  const confidencePercent = Math.round(activeProject.confidence.overall * 100);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <h1>GroundTruth</h1>
          <StatusIndicator label="curated source" tone="ready" />
        </div>
        <div className="location-chip">
          <MapPin aria-hidden="true" />
          <span>{activeProject.name}</span>
          <code>
            {activeProject.location.latitude.toFixed(4)},{" "}
            {activeProject.location.longitude.toFixed(4)}
          </code>
        </div>
        <SegmentedControl
          className="mode-control"
          label="Scene mode"
          onChange={setSceneMode}
          options={sceneModeOptions}
          value={sceneMode}
        />
      </header>

      <main className="workspace" data-mode={sceneMode}>
        <aside className="rail rail--left" aria-label="Capture and traits">
          <section className="rail-section">
            <SectionHeader
              action={
                <Tooltip label="Add source photos">
                  <IconButton label="Upload photos">
                    <Upload aria-hidden="true" />
                  </IconButton>
                </Tooltip>
              }
              title="Capture"
            />
            <div className="section-body">
              <FieldWrapper label="Curated example">
                <select
                  aria-label="Curated example"
                  onChange={(event) => loadDemoScene(event.currentTarget.value)}
                  value={activeProject.id}
                >
                  {catalog.map((scene) => (
                    <option key={scene.id} value={scene.id}>
                      {scene.name}
                    </option>
                  ))}
                </select>
              </FieldWrapper>
              <FieldWrapper label="Address">
                <input readOnly value={activeProject.location.address} />
              </FieldWrapper>
              <div className="drop-zone">
                <Camera aria-hidden="true" />
                <span>
                  {activeProject.evidence.length} source{" "}
                  {activeProject.evidence.length === 1 ? "photo" : "photos"} queued
                </span>
              </div>
              <div className="thumbnail-strip" aria-label="Evidence photos">
                {activeProject.evidence.map((photo, index) => (
                  <button className="thumbnail thumbnail--selected" key={photo.id} type="button">
                    <img alt="" src={photo.uri} />
                    <span>{String(index + 1).padStart(2, "0")}</span>
                  </button>
                ))}
              </div>
              <Button icon={<Layers aria-hidden="true" />} variant="primary">
                Generate scene
              </Button>
            </div>
          </section>

          <section className="rail-section rail-section--grow">
            <SectionHeader title="Traits" />
            <div className="trait-list">
              {traitRows.map((row) => {
                const value = activeProject.building[row.key];
                return (
                  <div className="trait-row" key={row.key}>
                    <span>{row.label}</span>
                    <strong>{row.format ? row.format(value) : String(value)}</strong>
                    <em>{row.source}</em>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>

        <section className="center-workspace" aria-label="Map and 3D workspace">
          <div className="workspace-tools">
            <SegmentedControl
              className="viewport-tabs"
              label="Viewport"
              onChange={setViewportMode}
              options={viewportOptions}
              value={viewportMode}
            />
            <div className="viewport-actions" aria-label="Viewport actions">
              <IconButton label="Locate footprint" tooltip="Locate footprint">
                <LocateFixed aria-hidden="true" />
              </IconButton>
              <IconButton label="Reset view" tooltip="Reset view">
                <RotateCcw aria-hidden="true" />
              </IconButton>
              <IconButton label="Expand workspace" tooltip="Expand workspace">
                <Maximize2 aria-hidden="true" />
              </IconButton>
            </div>
          </div>

          <div className="viewport-grid" data-active-viewport={viewportMode}>
            <article className="viewport-panel viewport-panel--map">
              <div className="viewport-title">
                <span>Map</span>
                <code>EPSG:4326</code>
              </div>
              <div className="map-stage" aria-label="Map initializes in Phase 5">
                <div className="north-indicator">N</div>
                <div className="coordinate-readout">
                  {activeProject.location.latitude.toFixed(4)},{" "}
                  {activeProject.location.longitude.toFixed(4)}
                </div>
                <div
                  className="footprint-preview"
                  style={{
                    aspectRatio: `${activeProject.footprint.widthM} / ${activeProject.footprint.depthM}`
                  }}
                >
                  <span />
                </div>
                <p>Map initializes in Phase 5</p>
              </div>
            </article>

            <article className="viewport-panel viewport-panel--scene">
              <div className="viewport-title">
                <span>3D Scene</span>
                <code>{sceneMode}</code>
              </div>
              <div className="scene-stage" aria-label="3D scene initializes in Phase 7">
                <Box aria-hidden="true" />
                <div className="mass-preview">
                  <span />
                  <span />
                  <span />
                </div>
                <p>3D scene initializes in Phase 7</p>
              </div>
            </article>
          </div>
        </section>

        <aside className="rail rail--right" aria-label="Evidence and output">
          <section className="rail-section">
            <SectionHeader
              action={
                <a
                  aria-label="Open source attribution"
                  className="source-link"
                  href={selectedEvidence.attribution.sourcePageUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink aria-hidden="true" />
                </a>
              }
              title="Evidence"
            />
            <figure className="evidence-preview">
              <img alt={selectedEvidence.alt} src={selectedEvidence.uri} />
              <figcaption>
                {selectedEvidence.attribution.creator} · {selectedEvidence.attribution.license}
              </figcaption>
            </figure>
            <div className="evidence-list">
              {activeProject.evidence.map((photo, index) => (
                <div className="evidence-item" key={photo.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{photo.title}</strong>
                  <em>
                    {photo.attribution.creator} · {photo.attribution.license}
                  </em>
                </div>
              ))}
            </div>
          </section>

          <section className="rail-section">
            <SectionHeader title="Output" />
            <div className="output-stack">
              <div className="output-row">
                <div>
                  <strong>GeoJSON</strong>
                  <span>
                    {activeProject.footprint.source} footprint · {activeProject.footprint.widthM}m x{" "}
                    {activeProject.footprint.depthM}m
                  </span>
                </div>
                <IconButton label="Download GeoJSON" tooltip="Download GeoJSON">
                  <Download aria-hidden="true" />
                </IconButton>
              </div>
              <div className="output-row">
                <div>
                  <strong>Metadata JSON</strong>
                  <span>{activeProject.provenance.length} provenance records</span>
                </div>
                <IconButton label="Download metadata" tooltip="Download metadata">
                  <Download aria-hidden="true" />
                </IconButton>
              </div>
            </div>
          </section>

          <section className="rail-section rail-section--grow">
            <SectionHeader title="Provenance" />
            <div className="provenance-panel">
              <div>
                <span>Confidence</span>
                <strong>{confidencePercent}%</strong>
              </div>
              {activeProject.assumptions.map((assumption) => (
                <p key={assumption.id}>{assumption.claim}</p>
              ))}
            </div>
          </section>
        </aside>
      </main>

      <footer className="statusbar">
        <StatusIndicator label="scene-ready placeholder" tone="ready" />
        <span>
          Source: <strong>{activeProject.location.source}</strong>
        </span>
        <span>
          Footprint: <strong>{activeProject.footprint.source}</strong>
        </span>
        <span className="statusbar__mode">
          <Activity aria-hidden="true" />
          {sceneModeOptions.find((option) => option.value === sceneMode)?.label}
        </span>
      </footer>
    </div>
  );
}
