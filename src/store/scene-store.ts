import { create } from "zustand";
import { defaultDemoSceneId, demoScenes, getDemoSceneById } from "../../shared/demo-scenes";
import {
  sceneProjectSchema,
  type BuildingTraits,
  type EvidencePhoto,
  type SceneMode,
  type SceneProject
} from "../../shared/scene-schema";
import {
  createRectangleFootprint,
  getApproximateDimensionsM,
  getProjectCentroid,
  normalizeBearing,
  rotateRingAroundCentroid,
  scaleRingAroundCentroid,
  translateRingMeters,
  type LngLat
} from "../../shared/geo";
import { deriveProjectTitle, validateEvidenceFiles } from "../features/capture/evidence-workflow";

export type GenerationStepStatus = "idle" | "complete" | "pending" | "warning";
export type GenerationState = "draft" | "ready" | "review-required";

export interface GenerationStep {
  id: "validate-evidence" | "resolve-location" | "prepare-footprint" | "prepare-traits";
  label: string;
  status: GenerationStepStatus;
  detail: string;
}

interface SceneStore {
  catalog: SceneProject[];
  activeProject: SceneProject;
  seedProject: SceneProject;
  selectedEvidenceId: string;
  addressDraft: string;
  uploadErrors: string[];
  uploadedEvidenceSizes: Record<string, number>;
  generationSteps: GenerationStep[];
  generationMessage: string;
  generationState: GenerationState;
  customTraitsConfirmed: boolean;
  generationRun: number;
  uploadSequence: number;
  loadDemoScene: (id: string) => void;
  setSceneMode: (mode: SceneMode) => void;
  updateScorchedSettings: (settings: Partial<SceneProject["scenario"]["scorched"]>) => void;
  updateDisasterSettings: (settings: Partial<SceneProject["scenario"]["disaster"]>) => void;
  setAddressDraft: (address: string) => void;
  addEvidenceFiles: (files: File[]) => void;
  removeEvidencePhoto: (id: string) => void;
  selectEvidencePhoto: (id: string) => void;
  generateScene: () => Promise<void>;
  confirmCustomTraits: () => void;
  setManualLocation: (coordinate: LngLat) => void;
  updateManualFootprint: (widthM: number, depthM: number, bearingDeg: number) => void;
  nudgeFootprint: (eastM: number, northM: number) => void;
  rotateFootprint: (degrees: number) => void;
  scaleFootprint: (scale: number) => void;
  setFacadeOrientation: (frontBearingDeg: number, viewpointBearingDeg: number) => void;
  updateBuildingTrait: <Key extends keyof BuildingTraits>(key: Key, value: BuildingTraits[Key]) => void;
  resetBuildingTrait: (key: keyof BuildingTraits) => void;
  resetSceneEdits: () => void;
  resetSession: () => void;
  disposeCustomUploads: () => void;
}

const defaultProject = sceneProjectSchema.parse(getDemoSceneById(defaultDemoSceneId));
const customObjectUrls = new Set<string>();
let activeGenerationController: AbortController | null = null;

const idleGenerationSteps: GenerationStep[] = [
  {
    id: "validate-evidence",
    label: "Validate evidence",
    status: "idle",
    detail: "Ready to check source photos"
  },
  {
    id: "resolve-location",
    label: "Resolve location",
    status: "idle",
    detail: "Curated scenes use stored location data"
  },
  {
    id: "prepare-footprint",
    label: "Prepare footprint",
    status: "idle",
    detail: "Curated scenes use stored footprint data"
  },
  {
    id: "prepare-traits",
    label: "Prepare building traits",
    status: "idle",
    detail: "Curated scenes use seeded traits"
  }
];

function cloneDefaultProject() {
  return sceneProjectSchema.parse(getDemoSceneById(defaultDemoSceneId));
}

function cloneProject(project: SceneProject) {
  return sceneProjectSchema.parse(project);
}

function cloneGenerationSteps(steps = idleGenerationSteps) {
  return steps.map((step) => ({ ...step }));
}

function revokeCustomObjectUrls() {
  customObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  customObjectUrls.clear();
}

function cancelActiveGeneration() {
  activeGenerationController?.abort();
  activeGenerationController = null;
}

async function fetchWithTimeout(url: string, options: RequestInit, signal: AbortSignal) {
  const timeout = window.setTimeout(() => activeGenerationController?.abort(), 8_000);
  try {
    return await fetch(url, { ...options, signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function createUploadEvidence(file: File, id: string, index: number): EvidencePhoto {
  const objectUrl = URL.createObjectURL(file);
  customObjectUrls.add(objectUrl);

  return {
    id,
    origin: "user-upload",
    claim: "observed",
    title: `User source photo ${index + 1}`,
    uri: objectUrl,
    alt: `User-uploaded source photo ${index + 1}.`,
    attribution: {
      creator: "User-provided session upload",
      sourcePageUrl: "https://groundtruth.local/session-upload",
      license: "User-provided; not persisted",
      licenseUrl: "https://groundtruth.local/session-upload",
      retrievedAt: new Date().toISOString().slice(0, 10),
      changes: "Stored only as an in-browser object URL for this session."
    }
  };
}

function buildCustomProject(addressDraft: string, evidence: EvidencePhoto[]): SceneProject {
  const title = deriveProjectTitle(addressDraft);
  const address = title === "Untitled field scene" ? "Address not set" : title;
  const center: LngLat = [0, 0];
  const footprintRing = createRectangleFootprint({
    center,
    widthM: 30,
    depthM: 20,
    bearingDeg: 0
  });

  return sceneProjectSchema.parse({
    schemaVersion: 1,
    id: "custom-session",
    name: title,
    updatedAt: new Date().toISOString(),
    location: {
      address,
      longitude: 0,
      latitude: 0,
      source: "manual"
    },
    footprint: {
      feature: {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [footprintRing]
        },
        properties: {
          scene_id: "custom-session",
          source: "manual-rectangle"
        }
      },
      source: "manual-rectangle",
      widthM: 30,
      depthM: 20,
      bearingDeg: 0,
      facadeOrientation: {
        note: "One-photo custom evidence may represent only the visible facade; mark front direction before 3D generation."
      }
    },
    evidence,
    building: {
      buildingType: "warehouse",
      floors: 1,
      heightM: 6,
      material: "concrete",
      roofType: "flat",
      windowPattern: "sparse",
      entrancePosition: "unknown"
    },
    scenario: {
      activeMode: "base",
      scorched: {
        decayIntensity: 0.25,
        scorchIntensity: 0.25,
        overgrowthIntensity: 0.15,
        boardedWindowRatio: 0.1,
        debrisDensity: 0.1,
        gameplayTags: ["custom-evidence", "review-required"]
      },
      disaster: {
        status: "simulated",
        damageType: "none",
        severity: 0,
        accessStatus: "unknown",
        hazards: [],
        responderNote: ""
      }
    },
    confidence: {
      overall: 0.28,
      location: 0.1,
      footprint: 0.12,
      traits: 0.25
    },
    assumptions: [
      {
        id: "custom-assumption-location",
        claim: "Custom location and footprint are pending GIS resolution.",
        affectedPath: "location",
        evidenceClaim: "unknown",
        rationale: "Use live GIS when configured or place the footprint manually."
      },
      {
        id: "custom-assumption-traits",
        claim: "Building traits use best-effort defaults and require review.",
        affectedPath: "building",
        evidenceClaim: "assumed",
        rationale: "No trait extraction model runs in this phase."
      }
    ],
    provenance: [
      {
        id: "custom-prov-evidence",
        target: "evidence",
        source: "manual",
        claim: "observed",
        label: "User-selected source photos for this browser session",
        evidenceIds: evidence.map((photo) => photo.id)
      },
      {
        id: "custom-prov-traits",
        target: "building",
        source: "rule",
        claim: "assumed",
        label: "Best-effort defaults; review required",
        evidenceIds: evidence.map((photo) => photo.id)
      }
    ]
  });
}

function withFootprint(
  project: SceneProject,
  ring: LngLat[],
  source: SceneProject["footprint"]["source"],
  bearingDeg = project.footprint.bearingDeg
) {
  const dimensions = getApproximateDimensionsM(ring);

  return sceneProjectSchema.parse({
    ...project,
    updatedAt: new Date().toISOString(),
    footprint: {
      ...project.footprint,
      feature: {
        ...project.footprint.feature,
        geometry: {
          type: "Polygon",
          coordinates: [ring]
        },
        properties: {
          ...project.footprint.feature.properties,
          source
        }
      },
      source,
      widthM: Math.max(1, Math.round(dimensions.widthM)),
      depthM: Math.max(1, Math.round(dimensions.depthM)),
      bearingDeg: normalizeBearing(bearingDeg)
    },
    confidence: {
      ...project.confidence,
      footprint: source === "manual-corrected" ? 0.42 : project.confidence.footprint
    },
    assumptions: ensureAssumption(project.assumptions, {
      id: "manual-footprint-correction",
      claim: "Footprint placement or shape has been manually corrected and should be reviewed.",
      affectedPath: "footprint",
      evidenceClaim: "assumed",
      rationale: "Manual corrections preserve demo continuity when live GIS data is unavailable or misaligned."
    }),
    provenance: ensureProvenance(project.provenance, {
      id: "manual-prov-footprint",
      target: "footprint",
      source: "manual",
      claim: "assumed",
      label: "Manual footprint correction",
      evidenceIds: project.evidence.map((photo) => photo.id)
    })
  });
}

function ensureAssumption(
  assumptions: SceneProject["assumptions"],
  assumption: SceneProject["assumptions"][number]
) {
  return assumptions.some((item) => item.id === assumption.id)
    ? assumptions
    : [...assumptions, assumption];
}

function ensureProvenance(
  provenance: SceneProject["provenance"],
  record: SceneProject["provenance"][number]
) {
  return provenance.some((item) => item.id === record.id) ? provenance : [...provenance, record];
}

async function resolveCustomScene(project: SceneProject, addressDraft: string, signal: AbortSignal) {
  const warnings: string[] = [];
  let nextProject = project;
  let locationResolved = false;
  let footprintResolved = false;

  try {
    const geocodeResponse = await fetchWithTimeout("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: addressDraft })
    }, signal);

    if (geocodeResponse.ok) {
      const payload = (await geocodeResponse.json()) as {
        data: {
          address: string;
          longitude: number;
          latitude: number;
          source: SceneProject["location"]["source"];
          confidence: number;
        };
        warnings: string[];
      };
      warnings.push(...payload.warnings);
      nextProject = sceneProjectSchema.parse({
        ...nextProject,
        name: deriveProjectTitle(payload.data.address),
        location: {
          address: payload.data.address,
          longitude: payload.data.longitude,
          latitude: payload.data.latitude,
          source: payload.data.source
        },
        confidence: {
          ...nextProject.confidence,
          location: payload.data.confidence
        },
        provenance: ensureProvenance(nextProject.provenance, {
          id: "custom-prov-location",
          target: "location",
          source: payload.data.source === "geocoder" ? "geocoder" : "manual",
          claim: payload.data.source === "geocoder" ? "inferred" : "assumed",
          label: payload.data.source === "geocoder" ? "Live geocoder result" : "Manual location",
          evidenceIds: nextProject.evidence.map((photo) => photo.id)
        })
      });
      locationResolved = true;
    } else {
      const payload = (await geocodeResponse.json()) as { error?: { message?: string; }; };
      warnings.push(payload.error?.message ?? "Geocoding unavailable; manual placement required.");
    }
  } catch {
    warnings.push("Geocoding request failed; manual placement required.");
  }

  try {
    const footprintResponse = await fetchWithTimeout("/api/footprint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: nextProject.location.address,
        longitude: nextProject.location.longitude,
        latitude: nextProject.location.latitude,
        widthM: nextProject.footprint.widthM,
        depthM: nextProject.footprint.depthM,
        bearingDeg: nextProject.footprint.bearingDeg
      })
    }, signal);

    if (footprintResponse.ok) {
      const payload = (await footprintResponse.json()) as {
        data: Pick<SceneProject["footprint"], "feature" | "source" | "widthM" | "depthM" | "bearingDeg"> & {
          confidence: number;
        };
        warnings: string[];
      };
      warnings.push(...payload.warnings);
      nextProject = sceneProjectSchema.parse({
        ...nextProject,
        footprint: {
          ...nextProject.footprint,
          feature: payload.data.feature,
          source: payload.data.source,
          widthM: payload.data.widthM,
          depthM: payload.data.depthM,
          bearingDeg: payload.data.bearingDeg
        },
        confidence: {
          ...nextProject.confidence,
          footprint: payload.data.confidence
        },
        assumptions: payload.data.source === "manual-rectangle"
          ? ensureAssumption(nextProject.assumptions, {
            id: "custom-assumption-manual-footprint",
            claim: "No authoritative footprint was found; an editable manual rectangle is active.",
            affectedPath: "footprint",
            evidenceClaim: "assumed",
            rationale: "Manual footprint controls keep the scene usable without a live GIS dependency."
          })
          : nextProject.assumptions,
        provenance: ensureProvenance(nextProject.provenance, {
          id: "custom-prov-footprint",
          target: "footprint",
          source: payload.data.source === "osm" ? "osm" : "manual",
          claim: payload.data.source === "osm" ? "inferred" : "assumed",
          label: payload.data.source === "osm" ? "OpenStreetMap building geometry" : "Manual footprint fallback",
          evidenceIds: nextProject.evidence.map((photo) => photo.id)
        })
      });
      footprintResolved = true;
    }
  } catch {
    warnings.push("Footprint request failed; manual rectangle remains active.");
  }

  const steps: GenerationStep[] = [
    {
      id: "validate-evidence",
      label: "Validate evidence",
      status: "complete",
      detail: `${nextProject.evidence.length} uploaded photo${nextProject.evidence.length === 1 ? "" : "s"} accepted`
    },
    {
      id: "resolve-location",
      label: "Resolve location",
      status: locationResolved ? "complete" : "warning",
      detail: locationResolved ? `Resolved from ${nextProject.location.source}` : "Manual placement required"
    },
    {
      id: "prepare-footprint",
      label: "Prepare footprint",
      status: footprintResolved ? "complete" : "warning",
      detail: `Using ${nextProject.footprint.source} geometry`
    },
    {
      id: "prepare-traits",
      label: "Prepare building traits",
      status: "warning",
      detail: "Best-effort defaults; review required"
    }
  ];

  return {
    project: sceneProjectSchema.parse({
      ...nextProject,
      assumptions: warnings.reduce(
        (assumptions, warning, index) =>
          ensureAssumption(assumptions, {
            id: `gis-warning-${index + 1}`,
            claim: warning,
            affectedPath: "location",
            evidenceClaim: "unknown",
            rationale: "GIS adapters preserve recoverable warnings for user review."
          }),
        nextProject.assumptions
      )
    }),
    steps,
    message: locationResolved || footprintResolved
      ? "Custom GIS placement prepared. Review source/confidence and correct the footprint if needed."
      : "Custom input validated. Use manual GIS controls to place and correct the footprint."
  };
}

function markManualGisReady(steps: GenerationStep[]) {
  return steps.map((step) => {
    if (step.id === "resolve-location") {
      return { ...step, status: "complete" as const, detail: "Manual location set" };
    }

    if (step.id === "prepare-footprint") {
      return { ...step, status: "complete" as const, detail: "Manual footprint correction active" };
    }

    return step;
  });
}

function getTotalUploadedBytes(uploadedEvidenceSizes: Record<string, number>) {
  return Object.values(uploadedEvidenceSizes).reduce((total, size) => total + size, 0);
}

export const useSceneStore = create<SceneStore>((set) => ({
  catalog: demoScenes,
  activeProject: defaultProject,
  seedProject: cloneProject(defaultProject),
  selectedEvidenceId: defaultProject.evidence[0].id,
  addressDraft: defaultProject.location.address,
  uploadErrors: [],
  uploadedEvidenceSizes: {},
  generationSteps: cloneGenerationSteps(),
  generationMessage: "Curated sample ready. Generate when evidence is selected.",
  generationState: "draft",
  customTraitsConfirmed: false,
  generationRun: 0,
  uploadSequence: 0,
  loadDemoScene: (id) => {
    const scene = getDemoSceneById(id);

    if (!scene) {
      throw new Error(`Unknown demo scene id: ${id}`);
    }

    cancelActiveGeneration();
    revokeCustomObjectUrls();
    const activeProject = sceneProjectSchema.parse(scene);

    set((state) => ({
      activeProject,
      seedProject: cloneProject(activeProject),
      selectedEvidenceId: activeProject.evidence[0].id,
      addressDraft: activeProject.location.address,
      uploadErrors: [],
      uploadedEvidenceSizes: {},
      generationSteps: cloneGenerationSteps(),
      generationMessage: "Curated sample ready. Generate when evidence is selected.",
      generationState: "draft",
      customTraitsConfirmed: false,
      generationRun: state.generationRun + 1
    }));
  },
  setSceneMode: (mode) => {
    set((state) => ({
      activeProject: sceneProjectSchema.parse({
        ...state.activeProject,
        scenario: {
          ...state.activeProject.scenario,
          activeMode: mode
        }
      })
    }));
  },
  updateScorchedSettings: (settings) => {
    set((state) => {
      const activeProject = sceneProjectSchema.parse({
        ...state.activeProject,
        updatedAt: new Date().toISOString(),
        scenario: {
          ...state.activeProject.scenario,
          scorched: {
            ...state.activeProject.scenario.scorched,
            ...settings
          }
        },
        provenance: ensureProvenance(state.activeProject.provenance, {
          id: "generated-scorched-scenario",
          target: "scenario.scorched",
          source: "rule",
          claim: "simulated",
          label: "Generated Scorched Nebraska scenario settings",
          evidenceIds: []
        })
      });
      return { activeProject };
    });
  },
  updateDisasterSettings: (settings) => {
    set((state) => {
      const disaster = { ...state.activeProject.scenario.disaster, ...settings };
      const activeProject = sceneProjectSchema.parse({
        ...state.activeProject,
        updatedAt: new Date().toISOString(),
        scenario: {
          ...state.activeProject.scenario,
          disaster
        },
        provenance: ensureProvenance(state.activeProject.provenance, {
          id: "disaster-response-scenario",
          target: "scenario.disaster",
          source: "rule",
          claim: disaster.status,
          label: `Disaster Response scenario settings (${disaster.status})`,
          evidenceIds: []
        })
      });
      return { activeProject };
    });
  },
  setAddressDraft: (address) => {
    set((state) => {
      if (state.activeProject.id !== "custom-session") {
        return { addressDraft: address };
      }

      cancelActiveGeneration();

      const activeProject = buildCustomProject(address, state.activeProject.evidence);

      return {
        activeProject,
        seedProject: cloneProject(activeProject),
        addressDraft: address,
        selectedEvidenceId: state.selectedEvidenceId,
        generationSteps: cloneGenerationSteps(),
        generationMessage: "Custom address updated. Generate to refresh workflow status.",
        generationState: "draft",
        customTraitsConfirmed: false,
        generationRun: state.generationRun + 1
      };
    });
  },
  addEvidenceFiles: (files) => {
    set((state) => {
      const existingUploadedSizes =
        state.activeProject.id === "custom-session" ? state.uploadedEvidenceSizes : {};
      const existingEvidence =
        state.activeProject.id === "custom-session" ? state.activeProject.evidence : [];
      const { acceptedFiles, errors } = validateEvidenceFiles(
        files,
        existingEvidence.length,
        getTotalUploadedBytes(existingUploadedSizes)
      );

      if (acceptedFiles.length === 0) {
        return { uploadErrors: errors };
      }

      cancelActiveGeneration();
      if (state.activeProject.id !== "custom-session") {
        revokeCustomObjectUrls();
      }

      const nextSizes = { ...existingUploadedSizes };
      const startingSequence = state.uploadSequence;
      const uploadedEvidence = acceptedFiles.map((file, index) => {
        const id = `custom-photo-${startingSequence + index + 1}`;
        nextSizes[id] = file.size;
        return createUploadEvidence(file, id, existingEvidence.length + index);
      });
      const evidence = [...existingEvidence, ...uploadedEvidence];
      const activeProject = buildCustomProject(state.addressDraft, evidence);

      return {
        activeProject,
        seedProject: cloneProject(activeProject),
        selectedEvidenceId: state.selectedEvidenceId.startsWith("custom-photo-")
          ? state.selectedEvidenceId
          : evidence[0].id,
        uploadErrors: errors,
        uploadedEvidenceSizes: nextSizes,
        uploadSequence: startingSequence + acceptedFiles.length,
        generationSteps: cloneGenerationSteps(),
        generationMessage: "Custom evidence queued. Generate to prepare available scene inputs.",
        generationState: "draft",
        customTraitsConfirmed: false,
        generationRun: state.generationRun + 1
      };
    });
  },
  removeEvidencePhoto: (id) => {
    set((state) => {
      if (state.activeProject.id !== "custom-session") {
        return state;
      }

      cancelActiveGeneration();
      const photo = state.activeProject.evidence.find((evidence) => evidence.id === id);

      if (!photo) {
        return state;
      }

      URL.revokeObjectURL(photo.uri);
      customObjectUrls.delete(photo.uri);

      const evidence = state.activeProject.evidence.filter((item) => item.id !== id);
      const uploadedEvidenceSizes = { ...state.uploadedEvidenceSizes };
      delete uploadedEvidenceSizes[id];

      if (evidence.length === 0) {
        const activeProject = cloneDefaultProject();

        return {
          activeProject,
          seedProject: cloneProject(activeProject),
          selectedEvidenceId: activeProject.evidence[0].id,
          addressDraft: activeProject.location.address,
          uploadedEvidenceSizes: {},
          uploadErrors: [],
          generationSteps: cloneGenerationSteps(),
          generationMessage: "Curated sample restored after removing the last custom photo.",
          generationState: "draft"
        };
      }

      const activeProject = buildCustomProject(state.addressDraft, evidence);
      const selectedEvidenceId =
        state.selectedEvidenceId === id ? evidence[0].id : state.selectedEvidenceId;

      return {
        activeProject,
        seedProject: cloneProject(activeProject),
        selectedEvidenceId,
        uploadedEvidenceSizes,
        uploadErrors: [],
        generationSteps: cloneGenerationSteps(),
        generationMessage: "Custom evidence changed. Generate to refresh workflow status.",
        generationState: "draft"
      };
    });
  },
  selectEvidencePhoto: (id) => {
    set((state) => {
      const exists = state.activeProject.evidence.some((photo) => photo.id === id);
      return exists ? { selectedEvidenceId: id } : state;
    });
  },
  generateScene: async () => {
    const state = useSceneStore.getState();
    const generationRun = state.generationRun + 1;
    const isCustom = state.activeProject.id === "custom-session";
    const hasAddress = deriveProjectTitle(state.addressDraft) !== "Untitled field scene";

    if (isCustom && hasAddress) {
      cancelActiveGeneration();
      const controller = new AbortController();
      activeGenerationController = controller;
      const generationSteps: GenerationStep[] = [
        {
          id: "validate-evidence",
          label: "Validate evidence",
          status: "complete",
          detail: `${state.activeProject.evidence.length} uploaded photo${state.activeProject.evidence.length === 1 ? "" : "s"
            } accepted`
        },
        {
          id: "resolve-location",
          label: "Resolve location",
          status: "pending",
          detail: "Resolving address through curated/live GIS adapters"
        },
        {
          id: "prepare-footprint",
          label: "Prepare footprint",
          status: "pending",
          detail: "Preparing OSM or manual footprint"
        },
        {
          id: "prepare-traits",
          label: "Prepare building traits",
          status: "warning",
          detail: "Best-effort defaults; review required"
        }
      ];

      set({
        generationRun,
        generationSteps,
        generationMessage: "Resolving custom scene GIS placement.",
        generationState: "draft"
      });

      const resolved = await resolveCustomScene(state.activeProject, state.addressDraft, controller.signal);

      const current = useSceneStore.getState();
      if (current.generationRun !== generationRun || current.activeProject.id !== state.activeProject.id) {
        return;
      }
      activeGenerationController = null;

      set({
        activeProject: resolved.project,
        seedProject: cloneProject(resolved.project),
        addressDraft: resolved.project.location.address,
        generationSteps: resolved.steps,
        generationMessage: "Scene ready for review. Custom traits are conservative defaults.",
        generationState: "review-required",
        customTraitsConfirmed: false
      });
      return;
    }

    set((current) => {
      const isCurrentCustom = current.activeProject.id === "custom-session";
      const currentHasAddress =
        deriveProjectTitle(current.addressDraft) !== "Untitled field scene";
      const generationSteps: GenerationStep[] = isCurrentCustom
        ? [
          {
            id: "validate-evidence",
            label: "Validate evidence",
            status: "complete",
            detail: `${current.activeProject.evidence.length} uploaded photo${current.activeProject.evidence.length === 1 ? "" : "s"
              } accepted`
          },
          {
            id: "resolve-location",
            label: "Resolve location",
            status: currentHasAddress ? "warning" : "pending",
            detail: currentHasAddress ? "Use manual map placement if geocoding is unavailable" : "Address required"
          },
          {
            id: "prepare-footprint",
            label: "Prepare footprint",
            status: "warning",
            detail: "Editable manual footprint is available"
          },
          {
            id: "prepare-traits",
            label: "Prepare building traits",
            status: "warning",
            detail: "Best-effort defaults; review required"
          }
        ]
        : [
          {
            id: "validate-evidence",
            label: "Validate evidence",
            status: "complete",
            detail: "Curated source photos are ready"
          },
          {
            id: "resolve-location",
            label: "Resolve location",
            status: "complete",
            detail: "Seeded from curated example"
          },
          {
            id: "prepare-footprint",
            label: "Prepare footprint",
            status: "complete",
            detail: "Seeded from curated example"
          },
          {
            id: "prepare-traits",
            label: "Prepare building traits",
            status: "complete",
            detail: "Seeded from curated example"
          }
        ];

      return {
        generationSteps,
        generationMessage: isCurrentCustom
          ? "Custom input validated. Use manual GIS controls to place and correct the footprint."
          : "Scene ready from seeded evidence, location, footprint, and traits.",
        generationState: isCurrentCustom ? "review-required" : "ready"
      };
    });
  },
  confirmCustomTraits: () => {
    set((state) => {
      if (state.activeProject.id !== "custom-session") return state;
      return {
        customTraitsConfirmed: true,
        generationState: "ready",
        generationMessage: "Custom traits confirmed. Scene remains editable and reviewable."
      };
    });
  },
  setManualLocation: (coordinate) => {
    set((state) => {
      const ring = createRectangleFootprint({
        center: coordinate,
        widthM: state.activeProject.footprint.widthM,
        depthM: state.activeProject.footprint.depthM,
        bearingDeg: state.activeProject.footprint.bearingDeg
      });
      const activeProject = sceneProjectSchema.parse({
        ...withFootprint(state.activeProject, ring, "manual-corrected"),
        location: {
          ...state.activeProject.location,
          longitude: coordinate[0],
          latitude: coordinate[1],
          source: "manual"
        },
        confidence: {
          ...state.activeProject.confidence,
          location: 0.45,
          footprint: 0.42
        }
      });

      return {
        activeProject,
        generationMessage: "Manual location placed. Adjust the footprint until it matches the map.",
        generationSteps: markManualGisReady(state.generationSteps)
      };
    });
  },
  updateManualFootprint: (widthM, depthM, bearingDeg) => {
    set((state) => {
      const center = getProjectCentroid(state.activeProject);
      const ring = createRectangleFootprint({ center, widthM, depthM, bearingDeg });
      const activeProject = withFootprint(state.activeProject, ring, "manual-rectangle", bearingDeg);

      return {
        activeProject,
        generationMessage: "Manual footprint dimensions updated.",
        generationSteps: markManualGisReady(state.generationSteps)
      };
    });
  },
  nudgeFootprint: (eastM, northM) => {
    set((state) => {
      const ring = translateRingMeters(
        state.activeProject.footprint.feature.geometry.coordinates[0],
        eastM,
        northM
      );
      const activeProject = withFootprint(state.activeProject, ring, "manual-corrected");
      const centroid = getProjectCentroid(activeProject);

      return {
        activeProject: sceneProjectSchema.parse({
          ...activeProject,
          location: {
            ...activeProject.location,
            longitude: centroid[0],
            latitude: centroid[1],
            source: "manual"
          }
        }),
        generationMessage: "Footprint nudged into manual correction state.",
        generationSteps: markManualGisReady(state.generationSteps)
      };
    });
  },
  rotateFootprint: (degrees) => {
    set((state) => {
      const ring = rotateRingAroundCentroid(
        state.activeProject.footprint.feature.geometry.coordinates[0],
        degrees
      );
      const bearingDeg = normalizeBearing(state.activeProject.footprint.bearingDeg + degrees);

      return {
        activeProject: withFootprint(state.activeProject, ring, "manual-corrected", bearingDeg),
        generationMessage: "Footprint rotated into manual correction state.",
        generationSteps: markManualGisReady(state.generationSteps)
      };
    });
  },
  scaleFootprint: (scale) => {
    set((state) => {
      const ring = scaleRingAroundCentroid(
        state.activeProject.footprint.feature.geometry.coordinates[0],
        scale
      );

      return {
        activeProject: withFootprint(state.activeProject, ring, "manual-corrected"),
        generationMessage: "Footprint scaled into manual correction state.",
        generationSteps: markManualGisReady(state.generationSteps)
      };
    });
  },
  setFacadeOrientation: (frontBearingDeg, viewpointBearingDeg) => {
    set((state) => ({
      activeProject: sceneProjectSchema.parse({
        ...state.activeProject,
        updatedAt: new Date().toISOString(),
        footprint: {
          ...state.activeProject.footprint,
          facadeOrientation: {
            frontBearingDeg: normalizeBearing(frontBearingDeg),
            viewpointBearingDeg: normalizeBearing(viewpointBearingDeg),
            note: "Source evidence marks the visible/front facade for later 3D generation."
          }
        },
        assumptions: ensureAssumption(state.activeProject.assumptions, {
          id: "facade-orientation-one-photo",
          claim: "Only the visible facade is represented by the current source evidence.",
          affectedPath: "footprint.facadeOrientation",
          evidenceClaim: "assumed",
          rationale: "Perspective/photo direction is tracked separately from the plan-view footprint."
        })
      }),
      generationMessage: "Facade orientation marked for later 3D generation."
    }));
  },
  updateBuildingTrait: (key, value) => {
    set((state) => {
      const manualId = `manual-trait-${key}`;
      const activeProject = sceneProjectSchema.parse({
        ...state.activeProject,
        updatedAt: new Date().toISOString(),
        building: { ...state.activeProject.building, [key]: value },
        confidence: { ...state.activeProject.confidence, traits: Math.min(state.activeProject.confidence.traits, 0.72) },
        assumptions: ensureAssumption(state.activeProject.assumptions, {
          id: manualId,
          claim: `${formatTraitLabel(key)} was manually edited and should be reviewed against source evidence.`,
          affectedPath: `building.${key}`,
          evidenceClaim: "assumed",
          rationale: "Manual edits are intentional overrides of seeded or inferred trait values."
        }),
        provenance: [
          ...state.activeProject.provenance.filter((record) => record.id !== manualId),
          {
            id: manualId,
            target: `building.${key}`,
            source: "manual",
            claim: "assumed",
            label: `Manually edited ${formatTraitLabel(key)}`,
            evidenceIds: state.activeProject.evidence.map((photo) => photo.id)
          }
        ]
      });

      return {
        activeProject,
        generationMessage: `${formatTraitLabel(key)} manually updated. Scene remains ready.`,
        generationState: state.generationState === "draft" ? "ready" : state.generationState
      };
    });
  },
  resetBuildingTrait: (key) => {
    set((state) => {
      const manualId = `manual-trait-${key}`;
      const activeProject = sceneProjectSchema.parse({
        ...state.activeProject,
        updatedAt: new Date().toISOString(),
        building: { ...state.activeProject.building, [key]: state.seedProject.building[key] },
        assumptions: state.activeProject.assumptions.filter((assumption) => assumption.id !== manualId),
        provenance: state.activeProject.provenance.filter((record) => record.id !== manualId)
      });

      return { activeProject, generationMessage: `${formatTraitLabel(key)} restored from the selected seed.` };
    });
  },
  resetSceneEdits: () => {
    set((state) => {
      const activeProject = sceneProjectSchema.parse({
        ...cloneProject(state.seedProject),
        scenario: {
          ...state.seedProject.scenario,
          activeMode: state.activeProject.scenario.activeMode
        }
      });

      return {
        activeProject,
        selectedEvidenceId: activeProject.evidence[0].id,
        addressDraft: activeProject.location.address,
        generationMessage: "Scene edits reset to the selected seeded record.",
        generationState: activeProject.id === "custom-session" ? "review-required" : "ready"
      };
    });
  },
  resetSession: () => {
    cancelActiveGeneration();
    revokeCustomObjectUrls();
    const activeProject = cloneDefaultProject();

    set((state) => ({
      activeProject,
      seedProject: cloneProject(activeProject),
      selectedEvidenceId: activeProject.evidence[0].id,
      addressDraft: activeProject.location.address,
      uploadErrors: [],
      uploadedEvidenceSizes: {},
      generationSteps: cloneGenerationSteps(),
      generationMessage: "Curated sample ready. Generate when evidence is selected.",
      generationState: "draft",
      customTraitsConfirmed: false,
      generationRun: state.generationRun + 1,
      uploadSequence: 0
    }));
  },
  disposeCustomUploads: () => {
    revokeCustomObjectUrls();
  }
}));

function formatTraitLabel(key: keyof BuildingTraits) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (character) => character.toUpperCase());
}
