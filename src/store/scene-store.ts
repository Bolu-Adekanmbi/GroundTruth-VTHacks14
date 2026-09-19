import { create } from "zustand";
import { defaultDemoSceneId, demoScenes, getDemoSceneById } from "../../shared/demo-scenes";
import {
  sceneProjectSchema,
  type EvidencePhoto,
  type SceneMode,
  type SceneProject
} from "../../shared/scene-schema";
import { deriveProjectTitle, validateEvidenceFiles } from "../features/capture/evidence-workflow";

export type GenerationStepStatus = "idle" | "complete" | "pending" | "warning";

export interface GenerationStep {
  id: "validate-evidence" | "resolve-location" | "prepare-footprint" | "prepare-traits";
  label: string;
  status: GenerationStepStatus;
  detail: string;
}

interface SceneStore {
  catalog: SceneProject[];
  activeProject: SceneProject;
  selectedEvidenceId: string;
  addressDraft: string;
  uploadErrors: string[];
  uploadedEvidenceSizes: Record<string, number>;
  generationSteps: GenerationStep[];
  generationMessage: string;
  uploadSequence: number;
  loadDemoScene: (id: string) => void;
  setSceneMode: (mode: SceneMode) => void;
  setAddressDraft: (address: string) => void;
  addEvidenceFiles: (files: File[]) => void;
  removeEvidencePhoto: (id: string) => void;
  selectEvidencePhoto: (id: string) => void;
  generateScene: () => void;
  resetSession: () => void;
  disposeCustomUploads: () => void;
}

const defaultProject = sceneProjectSchema.parse(getDemoSceneById(defaultDemoSceneId));
const customObjectUrls = new Set<string>();

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

function cloneGenerationSteps(steps = idleGenerationSteps) {
  return steps.map((step) => ({ ...step }));
}

function revokeCustomObjectUrls() {
  customObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  customObjectUrls.clear();
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
          coordinates: [
            [
              [-0.00012, -0.00008],
              [0.00012, -0.00008],
              [0.00012, 0.00008],
              [-0.00012, 0.00008],
              [-0.00012, -0.00008]
            ]
          ]
        },
        properties: {
          scene_id: "custom-session",
          source: "manual-rectangle"
        }
      },
      source: "manual-rectangle",
      widthM: 30,
      depthM: 20,
      bearingDeg: 0
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
        responderNote: "User-provided normal photos; no observed damage claim."
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
        rationale: "Live geocoding and map placement are introduced in later phases."
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

function getTotalUploadedBytes(uploadedEvidenceSizes: Record<string, number>) {
  return Object.values(uploadedEvidenceSizes).reduce((total, size) => total + size, 0);
}

export const useSceneStore = create<SceneStore>((set) => ({
  catalog: demoScenes,
  activeProject: defaultProject,
  selectedEvidenceId: defaultProject.evidence[0].id,
  addressDraft: defaultProject.location.address,
  uploadErrors: [],
  uploadedEvidenceSizes: {},
  generationSteps: cloneGenerationSteps(),
  generationMessage: "Curated sample ready. Generate when evidence is selected.",
  uploadSequence: 0,
  loadDemoScene: (id) => {
    const scene = getDemoSceneById(id);

    if (!scene) {
      throw new Error(`Unknown demo scene id: ${id}`);
    }

    revokeCustomObjectUrls();
    const activeProject = sceneProjectSchema.parse(scene);

    set({
      activeProject,
      selectedEvidenceId: activeProject.evidence[0].id,
      addressDraft: activeProject.location.address,
      uploadErrors: [],
      uploadedEvidenceSizes: {},
      generationSteps: cloneGenerationSteps(),
      generationMessage: "Curated sample ready. Generate when evidence is selected."
    });
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
  setAddressDraft: (address) => {
    set((state) => {
      if (state.activeProject.id !== "custom-session") {
        return { addressDraft: address };
      }

      const activeProject = buildCustomProject(address, state.activeProject.evidence);

      return {
        activeProject,
        addressDraft: address,
        selectedEvidenceId: state.selectedEvidenceId,
        generationSteps: cloneGenerationSteps(),
        generationMessage: "Custom address updated. Generate to refresh workflow status."
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
        selectedEvidenceId: state.selectedEvidenceId.startsWith("custom-photo-")
          ? state.selectedEvidenceId
          : evidence[0].id,
        uploadErrors: errors,
        uploadedEvidenceSizes: nextSizes,
        uploadSequence: startingSequence + acceptedFiles.length,
        generationSteps: cloneGenerationSteps(),
        generationMessage: "Custom evidence queued. Generate to prepare available scene inputs."
      };
    });
  },
  removeEvidencePhoto: (id) => {
    set((state) => {
      if (state.activeProject.id !== "custom-session") {
        return state;
      }

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
          selectedEvidenceId: activeProject.evidence[0].id,
          addressDraft: activeProject.location.address,
          uploadedEvidenceSizes: {},
          uploadErrors: [],
          generationSteps: cloneGenerationSteps(),
          generationMessage: "Curated sample restored after removing the last custom photo."
        };
      }

      const activeProject = buildCustomProject(state.addressDraft, evidence);
      const selectedEvidenceId =
        state.selectedEvidenceId === id ? evidence[0].id : state.selectedEvidenceId;

      return {
        activeProject,
        selectedEvidenceId,
        uploadedEvidenceSizes,
        uploadErrors: [],
        generationSteps: cloneGenerationSteps(),
        generationMessage: "Custom evidence changed. Generate to refresh workflow status."
      };
    });
  },
  selectEvidencePhoto: (id) => {
    set((state) => {
      const exists = state.activeProject.evidence.some((photo) => photo.id === id);
      return exists ? { selectedEvidenceId: id } : state;
    });
  },
  generateScene: () => {
    set((state) => {
      const isCustom = state.activeProject.id === "custom-session";
      const hasAddress = deriveProjectTitle(state.addressDraft) !== "Untitled field scene";
      const generationSteps: GenerationStep[] = isCustom
        ? [
            {
              id: "validate-evidence",
              label: "Validate evidence",
              status: "complete",
              detail: `${state.activeProject.evidence.length} uploaded photo${
                state.activeProject.evidence.length === 1 ? "" : "s"
              } accepted`
            },
            {
              id: "resolve-location",
              label: "Resolve location",
              status: "pending",
              detail: hasAddress ? "Address captured; geocoding begins in Phase 6" : "Address required"
            },
            {
              id: "prepare-footprint",
              label: "Prepare footprint",
              status: "pending",
              detail: "Manual and live footprints begin in Phase 6"
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
        generationMessage: isCustom
          ? "Custom input validated. GIS placement and footprint work remain pending."
          : "Curated scene generated from seeded evidence, location, footprint, and traits."
      };
    });
  },
  resetSession: () => {
    revokeCustomObjectUrls();
    const activeProject = cloneDefaultProject();

    set({
      activeProject,
      selectedEvidenceId: activeProject.evidence[0].id,
      addressDraft: activeProject.location.address,
      uploadErrors: [],
      uploadedEvidenceSizes: {},
      generationSteps: cloneGenerationSteps(),
      generationMessage: "Curated sample ready. Generate when evidence is selected.",
      uploadSequence: 0
    });
  },
  disposeCustomUploads: () => {
    revokeCustomObjectUrls();
  }
}));
