import {
  type ChangeEvent,
  type DragEvent,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState
} from "react";
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
  Trash2,
  Upload,
  X
} from "lucide-react";
import type { BuildingTraits, SceneMode } from "../../shared/scene-schema";
import { Button } from "../components/ui/Button";
import { FieldWrapper } from "../components/ui/FieldWrapper";
import { IconButton } from "../components/ui/IconButton";
import { SectionHeader } from "../components/ui/SectionHeader";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { StatusIndicator } from "../components/ui/StatusIndicator";
import { Tooltip } from "../components/ui/Tooltip";
import { PHOTO_LIMITS } from "../features/capture/evidence-workflow";
import { selectActiveProject, selectCatalog } from "../store/selectors";
import { useSceneStore } from "../store/scene-store";
import { formatCoordinate, formatDimension, getProjectCentroid } from "../../shared/geo";

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

const GisMap = lazy(() =>
  import("../features/map/GisMap").then((module) => ({ default: module.GisMap }))
);

const traitRows: Array<{
  key: keyof BuildingTraits;
  label: string;
  format?: (value: BuildingTraits[keyof BuildingTraits]) => string;
}> = [
  { key: "buildingType", label: "Building type", format: formatLabel },
  { key: "floors", label: "Floors", format: String },
  { key: "heightM", label: "Height", format: (value) => `${String(value)} m` },
  { key: "material", label: "Material", format: formatLabel },
  { key: "roofType", label: "Roof type", format: formatLabel },
  { key: "entrancePosition", label: "Entrance", format: formatLabel }
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
  const selectedEvidenceId = useSceneStore((state) => state.selectedEvidenceId);
  const addressDraft = useSceneStore((state) => state.addressDraft);
  const uploadErrors = useSceneStore((state) => state.uploadErrors);
  const generationSteps = useSceneStore((state) => state.generationSteps);
  const generationMessage = useSceneStore((state) => state.generationMessage);
  const loadDemoScene = useSceneStore((state) => state.loadDemoScene);
  const setSceneMode = useSceneStore((state) => state.setSceneMode);
  const setAddressDraft = useSceneStore((state) => state.setAddressDraft);
  const addEvidenceFiles = useSceneStore((state) => state.addEvidenceFiles);
  const removeEvidencePhoto = useSceneStore((state) => state.removeEvidencePhoto);
  const selectEvidencePhoto = useSceneStore((state) => state.selectEvidencePhoto);
  const generateScene = useSceneStore((state) => state.generateScene);
  const resetSession = useSceneStore((state) => state.resetSession);
  const disposeCustomUploads = useSceneStore((state) => state.disposeCustomUploads);
  const [viewportMode, setViewportMode] = useState<ViewportMode>("map");
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sceneMode = activeProject.scenario.activeMode;
  const selectedEvidence =
    activeProject.evidence.find((photo) => photo.id === selectedEvidenceId) ??
    activeProject.evidence[0];
  const confidencePercent = Math.round(activeProject.confidence.overall * 100);
  const isCustomScene = activeProject.id === "custom-session";
  const traitSourceLabel = isCustomScene
    ? "Best-effort defaults; review required"
    : "Seeded from curated example";
  const footprintCentroid = getProjectCentroid(activeProject);

  useEffect(() => disposeCustomUploads, [disposeCustomUploads]);

  function handleFiles(files: FileList | File[]) {
    addEvidenceFiles(Array.from(files));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.currentTarget.files) {
      handleFiles(event.currentTarget.files);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragActive(false);
    handleFiles(event.dataTransfer.files);
  }

  function handleResetSession() {
    if (isCustomScene) {
      const shouldReset = window.confirm("Reset the session and remove uploaded photo previews?");

      if (!shouldReset) {
        return;
      }
    }

    resetSession();
  }

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
                  <IconButton
                    label="Upload photos"
                    onClick={() => fileInputRef.current?.click()}
                    tooltip="Upload photos"
                  >
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
                  value={isCustomScene ? "custom-session" : activeProject.id}
                >
                  {isCustomScene ? <option value="custom-session">Custom evidence</option> : null}
                  {catalog.map((scene) => (
                    <option key={scene.id} value={scene.id}>
                      {scene.name}
                    </option>
                  ))}
                </select>
              </FieldWrapper>
              <FieldWrapper label="Address">
                <input
                  aria-label="Address"
                  onChange={(event) => setAddressDraft(event.currentTarget.value)}
                  placeholder="Enter field address"
                  value={addressDraft}
                />
              </FieldWrapper>
              <label
                className={`drop-zone${isDragActive ? " drop-zone--active" : ""}`}
                onDragLeave={() => setIsDragActive(false)}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Photo upload"
                  multiple
                  onChange={handleFileInputChange}
                  type="file"
                />
                <Camera aria-hidden="true" />
                <span>
                  Drop or choose JPEG, PNG, or WebP photos
                </span>
                <small>
                  {activeProject.evidence.length}/{PHOTO_LIMITS.maxPhotos} queued · 10 MB each ·
                  40 MB total
                </small>
              </label>
              {uploadErrors.length > 0 ? (
                <div className="capture-errors" role="status">
                  {uploadErrors.map((error) => (
                    <p key={error}>{error}</p>
                  ))}
                </div>
              ) : null}
              <div className="thumbnail-strip" aria-label="Evidence photos">
                {activeProject.evidence.map((photo, index) => (
                  <div
                    className={`thumbnail${photo.id === selectedEvidence.id ? " thumbnail--selected" : ""}`}
                    key={photo.id}
                  >
                    <button
                      aria-label={`Select ${photo.title}`}
                      className="thumbnail__select"
                      onClick={() => selectEvidencePhoto(photo.id)}
                      type="button"
                    >
                      <img alt="" src={photo.uri} />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </button>
                    {photo.origin === "user-upload" ? (
                      <IconButton
                        className="thumbnail__remove"
                        label={`Remove ${photo.title}`}
                        onClick={() => removeEvidencePhoto(photo.id)}
                        tooltip="Remove photo"
                      >
                        <X aria-hidden="true" />
                      </IconButton>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="capture-actions">
                <Button icon={<Layers aria-hidden="true" />} onClick={generateScene} variant="primary">
                  Generate scene
                </Button>
                <Button icon={<Trash2 aria-hidden="true" />} onClick={handleResetSession}>
                  Reset session
                </Button>
              </div>
              <div className="generation-panel" aria-live="polite">
                <strong>{generationMessage}</strong>
                <ol>
                  {generationSteps.map((step) => (
                    <li data-status={step.status} key={step.id}>
                      <span>{step.label}</span>
                      <em>{step.detail}</em>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="capture-note">
                {isCustomScene
                  ? "Custom uploads stay in this browser session and use best-effort defaults until review."
                  : "Curated traits are seeded from the selected normal-photo example."}
              </p>
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
                    <em>{traitSourceLabel}</em>
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
              <Suspense fallback={<MapLoadingFallback coordinate={footprintCentroid} />}>
                <GisMap project={activeProject} />
              </Suspense>
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
                selectedEvidence ? (
                  <a
                    aria-label="Open source attribution"
                    className="source-link"
                    href={selectedEvidence.attribution.sourcePageUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink aria-hidden="true" />
                  </a>
                ) : null
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
              <div className="gis-inspector" aria-label="GIS metadata">
                <div>
                  <span>Footprint source</span>
                  <strong>{formatLabel(activeProject.footprint.source)}</strong>
                </div>
                <div>
                  <span>Centroid</span>
                  <code>{formatCoordinate(footprintCentroid)}</code>
                </div>
                <div>
                  <span>Dimensions</span>
                  <strong>
                    {formatDimension(activeProject.footprint.widthM)} x{" "}
                    {formatDimension(activeProject.footprint.depthM)}
                  </strong>
                </div>
                <div>
                  <span>Bearing</span>
                  <strong>{Math.round(activeProject.footprint.bearingDeg)} deg</strong>
                </div>
                <div>
                  <span>Footprint confidence</span>
                  <strong>{Math.round(activeProject.confidence.footprint * 100)}%</strong>
                </div>
              </div>
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

function MapLoadingFallback({ coordinate }: { coordinate: [number, number] }) {
  return (
    <div aria-label="GIS map loading" className="gis-map-stage gis-map-stage--loading">
      <div className="north-indicator" aria-label="North indicator">
        N
      </div>
      <div className="coordinate-readout">
        <span>Footprint</span>
        <code>{formatCoordinate(coordinate)}</code>
      </div>
      <p className="map-loading">Loading map</p>
    </div>
  );
}
