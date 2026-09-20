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
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Layers,
  MapPin,
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
import type { BuildingTraits, FacadeModuleType, SceneMode } from "../../shared/scene-schema";
import type { VisionSuggestion } from "../../shared/api-schema";
import { Button } from "../components/ui/Button";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { FieldWrapper } from "../components/ui/FieldWrapper";
import { IconButton } from "../components/ui/IconButton";
import { SectionHeader } from "../components/ui/SectionHeader";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { StatusIndicator } from "../components/ui/StatusIndicator";
import { Tooltip } from "../components/ui/Tooltip";
import { PHOTO_LIMITS } from "../features/capture/evidence-workflow";
import { prepareVisionImages } from "../features/capture/vision-workflow";
import {
  buildGeoJsonExport,
  buildMetadataExport,
  downloadJson,
  getExportFilename
} from "../features/export/export-builders";
import { buildGlbExport, downloadGlb, getGlbFilename } from "../features/export/gltf-export";
import type { SceneViewportHandle } from "../features/scene/SceneViewport";
import { createResponderSummary } from "../features/scene/disaster-plan";
import { useNetworkStatus } from "../features/resilience/network-status";
import { selectActiveProject, selectCatalog } from "../store/selectors";
import { useSceneStore } from "../store/scene-store";
import { formatCoordinate, formatDimension, getProjectCentroid } from "../../shared/geo";

type ViewportMode = "map" | "scene";

const sceneModeOptions = [
  { value: "base", label: "Base" },
  { value: "scorched", label: "Scorched Nebraska" },
  { value: "disaster", label: "Disaster Response" }
] satisfies Array<{ value: SceneMode; label: string; }>;

const viewportOptions = [
  { value: "map", label: "Map" },
  { value: "scene", label: "3D" }
] satisfies Array<{ value: ViewportMode; label: string; }>;

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

const traitOptions: Partial<Record<keyof BuildingTraits, Array<{ value: string; label: string; }>>> = {
  buildingType: ["institutional", "academic", "warehouse", "office", "mixed-use"].map(option),
  material: ["brick", "concrete", "glass", "siding", "metal"].map(option),
  roofType: ["flat", "gable", "hip"].map(option),
  windowPattern: ["regular", "vertical-bands", "mixed", "sparse"].map(option),
  entrancePosition: ["north", "south", "east", "west", "corner", "unknown"].map(option)
};

const facadeModuleOptions: Array<{ value: FacadeModuleType; label: string; }> = [
  { value: "tower", label: "Tower" },
  { value: "portico", label: "Portico" },
  { value: "canopy", label: "Canopy" },
  { value: "bay", label: "Bay" },
  { value: "wing", label: "Wing" }
];

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
  const updateDisasterSettings = useSceneStore((state) => state.updateDisasterSettings);
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
  const confirmCustomTraits = useSceneStore((state) => state.confirmCustomTraits);
  const [viewportMode, setViewportMode] = useState<ViewportMode>("map");
  const [isDragActive, setIsDragActive] = useState(false);
  const [exportError, setExportError] = useState("");
  const [customLatitude, setCustomLatitude] = useState("");
  const [customLongitude, setCustomLongitude] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ address: string; longitude: number; latitude: number }>>([]);
  const [visionSuggestion, setVisionSuggestion] = useState<VisionSuggestion | null>(null);
  const [visionError, setVisionError] = useState("");
  const [visionPending, setVisionPending] = useState(false);
  const [isEvidenceViewerOpen, setIsEvidenceViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sceneViewportRef = useRef<SceneViewportHandle>(null);
  const selectedSuggestionRef = useRef("");
  const sceneMode = activeProject.scenario.activeMode;
  const selectedEvidence =
    activeProject.evidence.find((photo) => photo.id === selectedEvidenceId) ??
    activeProject.evidence[0];
  const confidencePercent = Math.round(activeProject.confidence.overall * 100);
  const isCustomScene = activeProject.id === "custom-session";
  const generationState = useSceneStore((state) => state.generationState);
  const customTraitsConfirmed = useSceneStore((state) => state.customTraitsConfirmed);
  const online = useNetworkStatus();
  const footprintCentroid = getProjectCentroid(activeProject);
  const facadeOrientation = activeProject.footprint.facadeOrientation;
  const disasterSummary = createResponderSummary(activeProject.scenario.disaster);
  const exportDisabledReason = activeProject.footprint.feature.geometry.coordinates[0]?.length >= 4
    ? ""
    : "A valid WGS84 footprint is required before exporting.";

  useEffect(() => disposeCustomUploads, [disposeCustomUploads]);
  useEffect(() => {
    if (!isEvidenceViewerOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsEvidenceViewerOpen(false);
      if (event.key === "ArrowLeft") selectEvidenceByOffset(-1);
      if (event.key === "ArrowRight") selectEvidenceByOffset(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });
  useEffect(() => {
    if (selectedSuggestionRef.current === addressDraft) {
      selectedSuggestionRef.current = "";
      setLocationSuggestions([]);
      return;
    }
    if (addressDraft.trim().length < 3 || !isCustomScene) {
      setLocationSuggestions([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      void fetch(`/api/geocode/suggest?q=${encodeURIComponent(addressDraft)}`)
        .then((response) => response.ok ? response.json() : { data: [] })
        .then((payload: { data?: Array<{ address: string; longitude: number; latitude: number }>; }) => setLocationSuggestions(payload.data ?? []))
        .catch(() => setLocationSuggestions([]));
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [addressDraft, isCustomScene]);

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

  function selectEvidenceByOffset(offset: number) {
    const currentIndex = Math.max(0, activeProject.evidence.findIndex((photo) => photo.id === selectedEvidence.id));
    const nextIndex = (currentIndex + offset + activeProject.evidence.length) % activeProject.evidence.length;
    selectEvidencePhoto(activeProject.evidence[nextIndex].id);
  }

  async function handleVisionSuggestion() {
    setVisionPending(true);
    setVisionError("");
    setVisionSuggestion(null);
    try {
      const images = await prepareVisionImages(activeProject.evidence);
      const response = await fetch("/api/vision/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images })
      });
      const payload = await response.json() as { data?: VisionSuggestion; error?: { message?: string; }; };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "Vision suggestions are unavailable.");
      setVisionSuggestion(payload.data);
    } catch (error) {
      setVisionError(error instanceof Error ? error.message : "Vision suggestions are unavailable.");
    } finally {
      setVisionPending(false);
    }
  }

  function applyVisionSuggestion() {
    if (!visionSuggestion) return;
    const { traits } = visionSuggestion;
    updateBuildingTrait("buildingType", traits.buildingType);
    updateBuildingTrait("floors", traits.floors);
    updateBuildingTrait("heightM", traits.heightM);
    updateBuildingTrait("material", traits.material);
    updateBuildingTrait("roofType", traits.roofType);
    updateBuildingTrait("windowPattern", traits.windowPattern);
    updateBuildingTrait("entrancePosition", traits.entrancePosition);
    updateBuildingTrait("facadeColor", visionSuggestion.dominantFacadeColor.toUpperCase());
    updateBuildingTrait("windowColumns", visionSuggestion.estimatedWindowColumns);
    updateBuildingTrait("facadeModules", visionSuggestion.facadeModules.map((module) => module.type));
    setVisionSuggestion(null);
  }

  async function handleDownload(format: "geojson" | "metadata" | "glb") {
    try {
      if (format === "glb") {
        downloadGlb(getGlbFilename(activeProject), await buildGlbExport(activeProject));
        setExportError("");
        return;
      }
      const payload = format === "geojson"
        ? buildGeoJsonExport(activeProject)
        : buildMetadataExport(activeProject);
      downloadJson(getExportFilename(activeProject, format), payload);
      setExportError("");
    } catch {
      setExportError("Export validation failed. Review the footprint and scene fields, then try again.");
    }
  }

  function handleGenerateScene() {
    const latitude = Number(customLatitude);
    const longitude = Number(customLongitude);
    if (isCustomScene && customLatitude && customLongitude && Number.isFinite(latitude) && Number.isFinite(longitude)) setManualLocation([longitude, latitude]);
    void generateScene();
  }

  return (
    <ErrorBoundary fallback={<AppRecovery onLoadDemo={() => loadDemoScene("burruss-hall")} />}>
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-title">
            <img src="/demo-assets/Logo-Cropped-transparent.png" alt="" />
            <h1>GroundTruth</h1>
          </div>
          <StatusIndicator label="curated source" tone="ready" />
          <StatusIndicator label={online ? "online" : "offline: curated demo available"} tone={online ? "neutral" : "warning"} />
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
              <FieldWrapper label="Location search">
                <input
                  aria-label="Address"
                  onChange={(event) => setAddressDraft(event.currentTarget.value)}
                  placeholder="Search a building or enter an address"
                  value={addressDraft}
                />
              </FieldWrapper>
              {locationSuggestions.length > 0 ? <div className="location-suggestions" role="listbox" aria-label="Location suggestions">
                {locationSuggestions.map((suggestion) => <button key={`${suggestion.longitude},${suggestion.latitude}`} onClick={() => { selectedSuggestionRef.current = suggestion.address; setAddressDraft(suggestion.address); setManualLocation([suggestion.longitude, suggestion.latitude]); setLocationSuggestions([]); void generateScene(); }} role="option" type="button">{suggestion.address}</button>)}
              </div> : null}
              <div className="manual-gis-grid">
                <FieldWrapper label="Latitude"><input aria-label="Custom latitude" inputMode="decimal" onChange={(event) => setCustomLatitude(event.currentTarget.value)} placeholder="Optional coordinate" type="number" value={customLatitude} /></FieldWrapper>
                <FieldWrapper label="Longitude"><input aria-label="Custom longitude" inputMode="decimal" onChange={(event) => setCustomLongitude(event.currentTarget.value)} placeholder="Optional coordinate" type="number" value={customLongitude} /></FieldWrapper>
              </div>
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
                  onClick={handleGenerateScene}
                  variant="primary"
                >
                  Generate scene
                </Button>
                <Button icon={<Trash2 aria-hidden="true" />} onClick={handleResetSession}>
                  Reset session
                </Button>
              </div>
              {isCustomScene ? <div className="vision-panel" aria-live="polite">
                <div>
                  <strong>Visible facade suggestions</strong>
                  <span>Optional and reviewable</span>
                </div>
                <Button disabled={visionPending} onClick={() => void handleVisionSuggestion()} variant="secondary">
                  {visionPending ? "Analyzing photos" : "Suggest visible traits"}
                </Button>
                {visionError ? <p className="vision-panel__error">{visionError}</p> : null}
                {visionSuggestion ? <div className="vision-suggestion">
                  <p><i style={{ backgroundColor: visionSuggestion.dominantFacadeColor }} />{visionSuggestion.dominantFacadeColorLabel} · {visionSuggestion.estimatedWindowColumns} windows across visible facade</p>
                  <p>{visionSuggestion.floorsRange.min}-{visionSuggestion.floorsRange.max} floors · {formatLabel(visionSuggestion.traits.roofType)} roof · {Math.round(visionSuggestion.confidence * 100)}% overall confidence</p>
                  {visionSuggestion.facadeModules.length > 0 ? <p>Visible modules: {visionSuggestion.facadeModules.map((module) => formatLabel(module.type)).join(", ")}</p> : null}
                  {visionSuggestion.assumptions.map((assumption) => <small key={assumption}>{assumption}</small>)}
                  <Button onClick={applyVisionSuggestion} variant="primary">Apply suggestions</Button>
                </div> : null}
              </div> : null}
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
                {isCustomScene && generationState === "review-required" ? (
                  <Button onClick={confirmCustomTraits} variant="secondary">
                    {customTraitsConfirmed ? "Custom traits confirmed" : "Confirm custom traits"}
                  </Button>
                ) : null}
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
              <div className="trait-row trait-row--editor">
                <span>Facade color</span>
                <div className="trait-row__control">
                  <input aria-label="Facade color" onChange={(event) => updateBuildingTrait("facadeColor", event.currentTarget.value)} type="color" value={activeProject.building.facadeColor ?? "#b7b1a4"} />
                </div>
              </div>
              <div className="trait-row trait-row--editor">
                <span>Windows across visible facade</span>
                <div className="trait-row__control">
                  <input aria-label="Windows across visible facade" max="40" min="1" onChange={(event) => updateBuildingTrait("windowColumns", event.currentTarget.value ? Number(event.currentTarget.value) : undefined)} type="number" value={activeProject.building.windowColumns ?? ""} />
                </div>
              </div>
              <fieldset className="facade-module-controls">
                <legend>Visible facade modules</legend>
                {facadeModuleOptions.map((module) => {
                  const selected = activeProject.building.facadeModules?.includes(module.value) ?? false;
                  return <label key={module.value}>
                    <input
                      checked={selected}
                      onChange={() => updateBuildingTrait(
                        "facadeModules",
                        selected
                          ? (activeProject.building.facadeModules ?? []).filter((item) => item !== module.value)
                          : [...(activeProject.building.facadeModules ?? []), module.value].slice(0, 3)
                      )}
                      type="checkbox"
                    />
                    {module.label}
                  </label>;
                })}
              </fieldset>
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
          </div>

          <div className="viewport-grid" data-active-viewport={viewportMode}>
            <article className="viewport-panel viewport-panel--map">
              <div className="viewport-title">
                <span>Map</span>
                <code>EPSG:4326</code>
              </div>
              <Suspense fallback={<MapLoadingFallback coordinate={footprintCentroid} />}>
                <ErrorBoundary fallback={<MapRecovery onLoadDemo={() => loadDemoScene("burruss-hall")} />}>
                  <GisMap project={activeProject} onSetManualLocation={setManualLocation} />
                </ErrorBoundary>
              </Suspense>
            </article>

            <article className="viewport-panel viewport-panel--scene">
              <div className="viewport-title">
                <span>3D Scene</span>
                <div className="viewport-title__meta">
                  <code>{sceneMode}</code>
                  <IconButton
                    label="Reset scene"
                    onClick={() => sceneViewportRef.current?.resetView()}
                    tooltip="Reset scene"
                  >
                    <RotateCcw aria-hidden="true" />
                  </IconButton>
                </div>
              </div>
              <Suspense fallback={<SceneLoadingFallback />}>
                <ErrorBoundary fallback={<SceneRecovery onLoadDemo={() => loadDemoScene("burruss-hall")} />}>
                  <SceneViewport project={activeProject} ref={sceneViewportRef} />
                </ErrorBoundary>
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
              <button aria-label={`Expand ${selectedEvidence.title}`} className="evidence-preview__open" onClick={() => setIsEvidenceViewerOpen(true)} type="button">
                <img alt={selectedEvidence.alt} src={selectedEvidence.uri} />
              </button>
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
                <IconButton disabled={Boolean(exportDisabledReason)} label="Download GeoJSON" onClick={() => void handleDownload("geojson")} tooltip={exportDisabledReason || "Download GeoJSON"}>
                  <Download aria-hidden="true" />
                </IconButton>
              </div>
              <div className="output-row">
                <div>
                  <strong>Metadata JSON</strong>
                  <span>Evidence, confidence, assumptions, and scenario state</span>
                </div>
                <IconButton disabled={Boolean(exportDisabledReason)} label="Download metadata" onClick={() => void handleDownload("metadata")} tooltip={exportDisabledReason || "Download metadata"}>
                  <Download aria-hidden="true" />
                </IconButton>
              </div>
              <div className="output-row">
                <div>
                  <strong>GLB 3D model</strong>
                  <span>glTF 2.0 binary · meters · Y-up · active scenario</span>
                </div>
                <IconButton disabled={Boolean(exportDisabledReason)} label="Download GLB 3D model" onClick={() => void handleDownload("glb")} tooltip={exportDisabledReason || "Download GLB 3D model"}>
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

          {sceneMode === "disaster" ? (
            <section className="rail-section">
              <SectionHeader title="Disaster Response" />
              <div className="scenario-panel">
                <span className="scenario-panel__label disaster">Operational scenario</span>
                <FieldWrapper label="Scenario status">
                  <select
                    aria-label="Scenario status"
                    onChange={(event) => updateDisasterSettings({ status: event.currentTarget.value as "simulated" | "observed" | "inferred" | "unknown" })}
                    value={activeProject.scenario.disaster.status}
                  >
                    <option value="simulated">Simulated scenario</option>
                    <option value="observed">Observed conditions</option>
                    <option value="inferred">Inferred from analysis</option>
                    <option value="unknown">Unknown / Not assessed</option>
                  </select>
                </FieldWrapper>
                <FieldWrapper label="Damage type">
                  <select
                    aria-label="Damage type"
                    onChange={(event) => updateDisasterSettings({ damageType: event.currentTarget.value as "none" | "fire" | "flood" | "wind" | "structural" })}
                    value={activeProject.scenario.disaster.damageType}
                  >
                    <option value="none">None / No damage</option>
                    <option value="fire">Fire damage</option>
                    <option value="flood">Flood damage</option>
                    <option value="wind">Wind damage</option>
                    <option value="structural">Structural damage</option>
                  </select>
                </FieldWrapper>
                <FieldWrapper label="Severity">
                  <div className="scenario-slider">
                    <input
                      aria-label="Damage severity"
                      max="1"
                      min="0"
                      onChange={(event) => updateDisasterSettings({ severity: Number(event.currentTarget.value) })}
                      step="0.05"
                      type="range"
                      value={activeProject.scenario.disaster.severity}
                    />
                    <output>{Math.round(activeProject.scenario.disaster.severity * 100)}%</output>
                  </div>
                </FieldWrapper>
                <FieldWrapper label="Access status">
                  <select
                    aria-label="Access status"
                    onChange={(event) => updateDisasterSettings({ accessStatus: event.currentTarget.value as "open" | "limited" | "blocked" | "unknown" })}
                    value={activeProject.scenario.disaster.accessStatus}
                  >
                    <option value="open">Accessible</option>
                    <option value="limited">Limited access</option>
                    <option value="blocked">Blocked</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </FieldWrapper>
                <label className="disaster-checkbox">
                  <input
                    aria-label="Primary entrance blocked"
                    checked={activeProject.scenario.disaster.blockedEntrances?.includes("primary") ?? false}
                    onChange={(event) => updateDisasterSettings({
                      blockedEntrances: event.currentTarget.checked ? ["primary"] : []
                    })}
                    type="checkbox"
                  />
                  <span>Primary entrance blocked</span>
                </label>
                <FieldWrapper label="Hazards">
                  <input
                    aria-label="Hazard tags"
                    onChange={(event) => updateDisasterSettings({
                      hazards: event.currentTarget.value.split(",").map((tag) => tag.trim()).filter(Boolean)
                    })}
                    placeholder="e.g., unstable roof, debris field, structural compromise"
                    value={activeProject.scenario.disaster.hazards.join(", ")}
                  />
                </FieldWrapper>
                <FieldWrapper label="Responder note">
                  <textarea
                    aria-label="Responder note"
                    onChange={(event) => updateDisasterSettings({ responderNote: event.currentTarget.value })}
                    value={activeProject.scenario.disaster.responderNote || disasterSummary}
                  />
                </FieldWrapper>
                <p className="disaster-caveat">Visible or entered conditions require verification and are not a structural safety determination.</p>
                <div className="scenario-metadata disaster-metadata">
                  <div><span>Status</span><strong className="status-label">{activeProject.scenario.disaster.status === "observed" ? "⚠ Observed" : "→ " + activeProject.scenario.disaster.status}</strong></div>
                  <div><span>Damage</span><strong>{activeProject.scenario.disaster.damageType}</strong></div>
                  <div><span>Access</span><strong className={`access-${activeProject.scenario.disaster.accessStatus}`}>{activeProject.scenario.disaster.accessStatus}</strong></div>
                </div>
                <div className="disaster-legend" aria-label="Disaster overlay legend">
                  <span><i className="disaster-legend__hazard" /> Hazard zone</span>
                  <span><i className="disaster-legend__access" /> Blocked access</span>
                  <span><i className="disaster-legend__damage" /> Simulated damage</span>
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

      {isEvidenceViewerOpen ? <div className="evidence-lightbox" onMouseDown={() => setIsEvidenceViewerOpen(false)} role="presentation">
        <section aria-label="Expanded evidence photo" aria-modal="true" className="evidence-lightbox__dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog">
          <div className="evidence-lightbox__header">
            <div>
              <strong>{selectedEvidence.title}</strong>
              <span>{activeProject.evidence.findIndex((photo) => photo.id === selectedEvidence.id) + 1} / {activeProject.evidence.length}</span>
            </div>
            <IconButton label="Close expanded evidence" onClick={() => setIsEvidenceViewerOpen(false)} tooltip="Close">
              <X aria-hidden="true" />
            </IconButton>
          </div>
          <div className="evidence-lightbox__image">
            {activeProject.evidence.length > 1 ? <IconButton label="Previous evidence photo" onClick={() => selectEvidenceByOffset(-1)} tooltip="Previous photo">
              <ChevronLeft aria-hidden="true" />
            </IconButton> : null}
            <img alt={selectedEvidence.alt} src={selectedEvidence.uri} />
            {activeProject.evidence.length > 1 ? <IconButton label="Next evidence photo" onClick={() => selectEvidenceByOffset(1)} tooltip="Next photo">
              <ChevronRight aria-hidden="true" />
            </IconButton> : null}
          </div>
          <p>{selectedEvidence.attribution.creator} · {selectedEvidence.attribution.license}</p>
        </section>
      </div> : null}

    </div>
    </ErrorBoundary>
  );
}

function AppRecovery({ onLoadDemo }: { onLoadDemo: () => void }) {
  return <div className="app-recovery" role="alert"><strong>GroundTruth needs to recover.</strong><Button onClick={onLoadDemo}>Load demo scene</Button></div>;
}

function MapRecovery({ onLoadDemo }: { onLoadDemo: () => void }) {
  return <div className="gis-map-stage gis-map-stage--loading" role="alert"><p className="map-loading">Map unavailable. Footprint exports remain available.</p><Button onClick={onLoadDemo}>Load demo scene</Button></div>;
}

function SceneRecovery({ onLoadDemo }: { onLoadDemo: () => void }) {
  return <div className="scene-stage scene-stage--fallback" role="alert"><p>3D preview unavailable. Map and exports remain available.</p><Button onClick={onLoadDemo}>Load demo scene</Button></div>;
}

function MapLoadingFallback({ coordinate }: { coordinate: [number, number]; }) {
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
