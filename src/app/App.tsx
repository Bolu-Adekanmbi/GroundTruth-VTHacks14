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
import { Button } from "../components/ui/Button";
import { FieldWrapper } from "../components/ui/FieldWrapper";
import { IconButton } from "../components/ui/IconButton";
import { SectionHeader } from "../components/ui/SectionHeader";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { StatusIndicator } from "../components/ui/StatusIndicator";
import { Tooltip } from "../components/ui/Tooltip";

type SceneMode = "base" | "scorched" | "disaster";
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

export function App() {
  const [sceneMode, setSceneMode] = useState<SceneMode>("base");
  const [viewportMode, setViewportMode] = useState<ViewportMode>("map");

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <h1>GroundTruth</h1>
          <StatusIndicator label="curated source" tone="ready" />
        </div>
        <div className="location-chip">
          <MapPin aria-hidden="true" />
          <span>Blacksburg field scene</span>
          <code>37.2296, -80.4139</code>
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
                <select defaultValue="burruss-hall">
                  <option value="burruss-hall">Burruss Hall field set</option>
                  <option value="urban-corner">Urban corner warehouse</option>
                </select>
              </FieldWrapper>
              <FieldWrapper label="Address">
                <input defaultValue="800 Drillfield Drive, Blacksburg, VA" />
              </FieldWrapper>
              <div className="drop-zone">
                <Camera aria-hidden="true" />
                <span>3 source photos queued</span>
              </div>
              <div className="thumbnail-strip" aria-label="Evidence photos">
                <button className="thumbnail thumbnail--selected" type="button">
                  01
                </button>
                <button className="thumbnail" type="button">
                  02
                </button>
                <button className="thumbnail" type="button">
                  03
                </button>
              </div>
              <Button icon={<Layers aria-hidden="true" />} variant="primary">
                Generate scene
              </Button>
            </div>
          </section>

          <section className="rail-section rail-section--grow">
            <SectionHeader title="Traits" />
            <div className="trait-list">
              <div className="trait-row">
                <span>Building type</span>
                <strong>Institutional</strong>
                <em>Seeded</em>
              </div>
              <div className="trait-row">
                <span>Floors</span>
                <strong>5</strong>
                <em>Assumed</em>
              </div>
              <div className="trait-row">
                <span>Material</span>
                <strong>Brick</strong>
                <em>Observed</em>
              </div>
              <div className="trait-row">
                <span>Roof type</span>
                <strong>Flat parapet</strong>
                <em>Seeded</em>
              </div>
              <div className="trait-row">
                <span>Entrance</span>
                <strong>South face</strong>
                <em>Assumed</em>
              </div>
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
                <div className="coordinate-readout">37.2296, -80.4139</div>
                <div className="footprint-preview">
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
                <IconButton label="Open source attribution" tooltip="Open source attribution">
                  <ExternalLink aria-hidden="true" />
                </IconButton>
              }
              title="Evidence"
            />
            <div className="evidence-list">
              <div className="evidence-item">
                <span>01</span>
                <strong>South facade</strong>
                <em>Curated photo</em>
              </div>
              <div className="evidence-item">
                <span>02</span>
                <strong>Entry detail</strong>
                <em>Curated photo</em>
              </div>
              <div className="evidence-item">
                <span>03</span>
                <strong>Corner context</strong>
                <em>Curated photo</em>
              </div>
            </div>
          </section>

          <section className="rail-section">
            <SectionHeader title="Output" />
            <div className="output-stack">
              <div className="output-row">
                <div>
                  <strong>GeoJSON</strong>
                  <span>Footprint polygon</span>
                </div>
                <IconButton label="Download GeoJSON" tooltip="Download GeoJSON">
                  <Download aria-hidden="true" />
                </IconButton>
              </div>
              <div className="output-row">
                <div>
                  <strong>Metadata JSON</strong>
                  <span>Sources and assumptions</span>
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
                <strong>82%</strong>
              </div>
              <p>Rear facade not represented in evidence.</p>
              <p>Height seeded from curated scene profile.</p>
            </div>
          </section>
        </aside>
      </main>

      <footer className="statusbar">
        <StatusIndicator label="scene-ready placeholder" tone="ready" />
        <span>
          Source: <strong>curated</strong>
        </span>
        <span>
          Footprint: <strong>pending Phase 5</strong>
        </span>
        <span className="statusbar__mode">
          <Activity aria-hidden="true" />
          {sceneModeOptions.find((option) => option.value === sceneMode)?.label}
        </span>
      </footer>
    </div>
  );
}
