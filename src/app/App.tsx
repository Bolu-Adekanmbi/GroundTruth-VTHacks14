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
  Camera,
  Download,
  ExternalLink,
  Layers,
  LocateFixed,
  MapPin,
  Maximize2,
  MoveDown,
  MoveLeft,
  MoveRight,
  MoveUp,
  RotateCcw,
  RotateCw,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut
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
import {
  buildGeoJsonExport,
  buildMetadataExport,
  downloadJson,
  getExportFilename
} from "../features/export/export-builders";
import type { SceneViewportHandle } from "../features/scene/SceneViewport";
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

const SceneViewport = lazy(() =>
  import("../features/scene/SceneViewport").then((module) => ({ default: module.SceneViewport }))
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
  { key: "windowPattern", label: "Window pattern", format: formatLabel },
  { key: "entrancePosition", label: "Entrance", format: formatLabel }
];

const traitOptions: Partial<Record<keyof BuildingTraits, Array<{ value: string; label: string }>>> = {
  buildingType: ["institutional", "academic", "warehouse", "office", "mixed-use"].map(option),
  material: ["brick", "concrete", "glass", "siding", "metal"].map(option),
  roofType: ["flat", "gable", "hip"].map(option),
  windowPattern: ["regular", "vertical-bands", "mixed", "sparse"].map(option),
  entrancePosition: ["north", "south", "east", "west", "corner", "unknown"].map(option)
};

function formatLabel(value: unknown) {
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function option(value: string) {
  return { value, label: formatLabel(value) };
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
  const updateScorchedSettings = useSceneStore((state) => state.updateScorchedSettings);
  const setAddressDraft = useSceneStore((state) => state.setAddressDraft);
  const addEvidenceFiles = useSceneStore((state) => state.addEvidenceFiles);
  const removeEvidencePhoto = useSceneStore((state) => state.removeEvidencePhoto);
  const selectEvidencePhoto = useSceneStore((state) => state.selectEvidencePhoto);
  const generateScene = useSceneStore((state) => state.generateScene);
  const setManualLocation = useSceneStore((state) => state.setManualLocation);
  const updateManualFootprint = useSceneStore((state) => state.updateManualFootprint);
  const nudgeFootprint = useSceneStore((state) => state.nudgeFootprint);
  const rotateFootprint = useSceneStore((state) => state.rotateFootprint);
  const scaleFootprint = useSceneStore((state) => state.scaleFootprint);
  const setFacadeOrientation = useSceneStore((state) => state.setFacadeOrientation);
  const updateBuildingTrait = useSceneStore((state) => state.updateBuildingTrait);
  const resetBuildingTrait = useSceneStore((state) => state.resetBuildingTrait);
  const resetSceneEdits = useSceneStore((state) => state.resetSceneEdits);
  const resetSession = useSceneStore((state) => state.resetSession);
  const disposeCustomUploads = useSceneStore((state) => state.disposeCustomUploads);
  const [viewportMode, setViewportMode] = useState<ViewportMode>("map");
  const [isDragActive, setIsDragActive] = useState(false);
  const [exportError, setExportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sceneViewportRef = useRef<SceneViewportHandle>(null);
  const sceneMode = activeProject.scenario.activeMode;
  const selectedEvidence =
    activeProject.evidence.find((photo) => photo.id === selectedEvidenceId) ??
    activeProject.evidence[0];
  const confidencePercent = Math.round(activeProject.confidence.overall * 100);
  const isCustomScene = activeProject.id === "custom-session";
  const generationState = useSceneStore((state) => state.generationState);
  const footprintCentroid = getProjectCentroid(activeProject);
  const facadeOrientation = activeProject.footprint.facadeOrientation;
  const exportDisabledReason = activeProject.footprint.feature.geometry.coordinates[0]?.length >= 4
    ? ""
    : "A valid WGS84 footprint is required before exporting.";

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

  function handleDownload(format: "geojson" | "metadata") {
    try {
      const payload = format === "geojson"
        ? buildGeoJsonExport(activeProject)
        : buildMetadataExport(activeProject);
      downloadJson(getExportFilename(activeProject, format), payload);
      setExportError("");
    } catch {
      setExportError("Export validation failed. Review the footprint and scene fields, then try again.");
    }
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
                <Button
                  icon={<Layers aria-hidden="true" />}
                  onClick={() => {
                    void generateScene();
                  }}
                  variant="primary"
                >
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
              <div className="manual-gis-panel" aria-label="Manual GIS correction controls">
                <div className="manual-gis-panel__header">
                  <strong>Manual GIS</strong>
                  <span>{formatLabel(activeProject.footprint.source)}</span>
                </div>
                <div className="manual-gis-grid">
                  <FieldWrapper label="Latitude">
                    <input
                      aria-label="Manual latitude"
                      inputMode="decimal"
                      onChange={(event) =>
                        setManualLocation([
                          activeProject.location.longitude,
                          Number(event.currentTarget.value)
                        ])
                      }
                      type="number"
                      value={Number(activeProject.location.latitude.toFixed(6))}
                    />
                  </FieldWrapper>
                  <FieldWrapper label="Longitude">
                    <input
                      aria-label="Manual longitude"
                      inputMode="decimal"
                      onChange={(event) =>
                        setManualLocation([
                          Number(event.currentTarget.value),
                          activeProject.location.latitude
                        ])
                      }
                      type="number"
                      value={Number(activeProject.location.longitude.toFixed(6))}
                    />
                  </FieldWrapper>
                  <FieldWrapper label="Width m">
                    <input
                      aria-label="Footprint width meters"
                      min="1"
                      onChange={(event) =>
                        updateManualFootprint(
                          Number(event.currentTarget.value),
                          activeProject.footprint.depthM,
                          activeProject.footprint.bearingDeg
                        )
                      }
                      type="number"
                      value={activeProject.footprint.widthM}
                    />
                  </FieldWrapper>
                  <FieldWrapper label="Depth m">
                    <input
                      aria-label="Footprint depth meters"
                      min="1"
                      onChange={(event) =>
                        updateManualFootprint(
                          activeProject.footprint.widthM,
                          Number(event.currentTarget.value),
                          activeProject.footprint.bearingDeg
                        )
                      }
                      type="number"
                      value={activeProject.footprint.depthM}
                    />
                  </FieldWrapper>
                  <FieldWrapper label="Bearing">
                    <input
                      aria-label="Footprint bearing degrees"
                      max="359"
                      min="0"
                      onChange={(event) =>
                        updateManualFootprint(
                          activeProject.footprint.widthM,
                          activeProject.footprint.depthM,
                          Number(event.currentTarget.value)
                        )
                      }
                      type="number"
                      value={Math.round(activeProject.footprint.bearingDeg)}
                    />
                  </FieldWrapper>
                  <FieldWrapper label="Front">
                    <input
                      aria-label="Front facade bearing degrees"
                      max="359"
                      min="0"
                      onChange={(event) =>
                        setFacadeOrientation(
                          Number(event.currentTarget.value),
                          facadeOrientation?.viewpointBearingDeg ?? activeProject.footprint.bearingDeg
                        )
                      }
                      type="number"
                      value={Math.round(
                        facadeOrientation?.frontBearingDeg ?? activeProject.footprint.bearingDeg
                      )}
                    />
                  </FieldWrapper>
                </div>
                <div className="manual-gis-actions" aria-label="Nudge footprint">
                  <IconButton label="Nudge west" onClick={() => nudgeFootprint(-2, 0)} tooltip="Nudge west">
                    <MoveLeft aria-hidden="true" />
                  </IconButton>
                  <IconButton label="Nudge north" onClick={() => nudgeFootprint(0, 2)} tooltip="Nudge north">
                    <MoveUp aria-hidden="true" />
                  </IconButton>
                  <IconButton label="Nudge south" onClick={() => nudgeFootprint(0, -2)} tooltip="Nudge south">
                    <MoveDown aria-hidden="true" />
                  </IconButton>
                  <IconButton label="Nudge east" onClick={() => nudgeFootprint(2, 0)} tooltip="Nudge east">
                    <MoveRight aria-hidden="true" />
                  </IconButton>
                  <IconButton label="Rotate footprint" onClick={() => rotateFootprint(5)} tooltip="Rotate 5 degrees">
                    <RotateCw aria-hidden="true" />
                  </IconButton>
                  <IconButton label="Scale footprint down" onClick={() => scaleFootprint(0.95)} tooltip="Scale down">
                    <ZoomOut aria-hidden="true" />
                  </IconButton>
                  <IconButton label="Scale footprint up" onClick={() => scaleFootprint(1.05)} tooltip="Scale up">
                    <ZoomIn aria-hidden="true" />
                  </IconButton>
                </div>
                <p>
                  Click the map to set a manual center. Keep photo-facing facade direction separate
                  from north.
                </p>
              </div>
              <p className="capture-note">
                {isCustomScene
                  ? "Custom uploads stay in this browser session and use best-effort defaults until review."
                  : "Curated traits are seeded from the selected normal-photo example."}
              </p>
            </div>
          </section>

          <section className="rail-section rail-section--grow">
            <SectionHeader
              action={
                <IconButton
                  label="Reset scene edits"
                  onClick={resetSceneEdits}
                  tooltip="Reset scene edits"
                >
                  <RotateCcw aria-hidden="true" />
                </IconButton>
              }
              title="Traits"
            />
            <div className="trait-list">
              {traitRows.map((row) => {
                const value = activeProject.building[row.key];
                const manuallyEdited = activeProject.provenance.some(
                  (record) => record.id === `manual-trait-${row.key}`
                );
                const selectableOptions = traitOptions[row.key];
                return (
                  <div className="trait-row trait-row--editor" key={row.key}>
                    <span>{row.label}</span>
                    <div className="trait-row__control">
                      {selectableOptions ? (
                        <select
                          aria-label={row.label}
                          onChange={(event) =>
                            updateBuildingTrait(
                              row.key,
                              event.currentTarget.value as BuildingTraits[typeof row.key]
                            )
                          }
                          value={String(value)}
                        >
                          {selectableOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          aria-label={row.label}
                          min={row.key === "floors" ? 1 : 2.5}
                          onChange={(event) =>
                            updateBuildingTrait(
                              row.key,
                              Number(event.currentTarget.value) as BuildingTraits[typeof row.key]
                            )
                          }
                          step={row.key === "floors" ? 1 : 0.5}
                          type="number"
                          value={value}
                        />
                      )}
                      {manuallyEdited ? (
                        <IconButton
                          label={`Reset ${row.label}`}
                          onClick={() => resetBuildingTrait(row.key)}
                          tooltip={`Reset ${row.label}`}
                        >
                          <RotateCcw aria-hidden="true" />
                        </IconButton>
                      ) : null}
                    </div>
                    <em>
                      {manuallyEdited
                        ? "Manually edited"
                        : isCustomScene
                          ? "Assumed; review required"
                          : "Seeded from curated example"}
                    </em>
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
              <IconButton
                label="Reset view"
                onClick={() => sceneViewportRef.current?.resetView()}
                tooltip="Reset view"
              >
                <RotateCcw aria-hidden="true" />
              </IconButton>
              <IconButton
                label="Fit building"
                onClick={() => sceneViewportRef.current?.fitBuilding()}
                tooltip="Fit building"
              >
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
                <GisMap project={activeProject} onSetManualLocation={setManualLocation} />
              </Suspense>
            </article>

            <article className="viewport-panel viewport-panel--scene">
              <div className="viewport-title">
                <span>3D Scene</span>
                <code>{sceneMode}</code>
              </div>
              <Suspense fallback={<SceneLoadingFallback />}>
                <SceneViewport project={activeProject} ref={sceneViewportRef} />
              </Suspense>
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
                  <span>Front facade</span>
                  <strong>
                    {facadeOrientation?.frontBearingDeg === undefined
                      ? "Unmarked"
                      : `${Math.round(facadeOrientation.frontBearingDeg)} deg`}
                  </strong>
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
                    GIS-compatible geometry · ArcGIS-ready attributes
                  </span>
                </div>
                <IconButton disabled={Boolean(exportDisabledReason)} label="Download GeoJSON" onClick={() => handleDownload("geojson")} tooltip={exportDisabledReason || "Download GeoJSON"}>
                  <Download aria-hidden="true" />
                </IconButton>
              </div>
              <div className="output-row">
                <div>
                  <strong>Metadata JSON</strong>
                  <span>Evidence, confidence, assumptions, and scenario state</span>
                </div>
                <IconButton disabled={Boolean(exportDisabledReason)} label="Download metadata" onClick={() => handleDownload("metadata")} tooltip={exportDisabledReason || "Download metadata"}>
                  <Download aria-hidden="true" />
                </IconButton>
              </div>
              {exportDisabledReason ? <p className="export-message">{exportDisabledReason}</p> : null}
              {exportError ? <p className="export-message export-message--error" role="alert">{exportError}</p> : null}
            </div>
          </section>

          {sceneMode === "scorched" ? (
            <section className="rail-section">
              <SectionHeader title="Scorched Scenario" />
              <div className="scenario-panel">
                <span className="scenario-panel__label">Generated scenario attributes</span>
                {[
                  ["Decay", "decayIntensity"],
                  ["Scorch", "scorchIntensity"],
                  ["Overgrowth", "overgrowthIntensity"],
                  ["Boarded windows", "boardedWindowRatio"],
                  ["Debris", "debrisDensity"]
                ].map(([label, key]) => {
                  const settingKey = key as keyof typeof activeProject.scenario.scorched;
                  const value = activeProject.scenario.scorched[settingKey];
                  if (typeof value !== "number") return null;
                  return (
                    <FieldWrapper key={key} label={label}>
                      <div className="scenario-slider">
                        <input
                          aria-label={`${label} intensity`}
                          max="1"
                          min="0"
                          onChange={(event) => updateScorchedSettings({ [settingKey]: Number(event.currentTarget.value) })}
                          step="0.05"
                          type="range"
                          value={value}
                        />
                        <output>{Math.round(value * 100)}%</output>
                      </div>
                    </FieldWrapper>
                  );
                })}
                <FieldWrapper label="Gameplay tags">
                  <input
                    aria-label="Gameplay tags"
                    onChange={(event) => updateScorchedSettings({
                      gameplayTags: event.currentTarget.value.split(",").map((tag) => tag.trim()).filter(Boolean)
                    })}
                    value={activeProject.scenario.scorched.gameplayTags.join(", ")}
                  />
                </FieldWrapper>
                <div className="scenario-metadata">
                  <div><span>Asset class</span><strong>Scorched landmark</strong></div>
                  <div><span>Traversal</span><strong>{activeProject.scenario.scorched.debrisDensity > 0.55 ? "Obstructed exterior" : "Perimeter accessible"}</strong></div>
                  <div><span>Condition</span><strong>{activeProject.scenario.scorched.scorchIntensity > 0.55 ? "Heavy fire damage" : "Weathered fire damage"}</strong></div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="rail-section rail-section--grow">
            <SectionHeader title="Provenance" />
            <div className="provenance-panel">
              <div>
                <span>Confidence</span>
                <strong>
                  {confidencePercent}% {confidencePercent >= 75 ? "evidence-backed" : "review required"}
                </strong>
              </div>
              {activeProject.assumptions.map((assumption) => (
                <p key={assumption.id}>
                  <code>{assumption.affectedPath}</code>
                  {assumption.claim}
                </p>
              ))}
            </div>
          </section>
        </aside>
      </main>

      <footer className="statusbar">
        <StatusIndicator
          label={
            generationState === "ready"
              ? "scene-ready"
              : generationState === "review-required"
                ? "scene ready; review traits"
                : "scene draft"
          }
          tone={generationState === "draft" ? "warning" : "ready"}
        />
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

function SceneLoadingFallback() {
  return (
    <div aria-label="3D scene loading" className="scene-stage scene-stage--fallback">
      <p>Preparing procedural building</p>
    </div>
  );
}
