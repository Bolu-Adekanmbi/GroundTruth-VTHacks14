import { sceneProjectSchema, type SceneProject } from "./scene-schema.js";

const retrievedAt = "2026-09-19";

const rawDemoScenes = [
  {
    schemaVersion: 1,
    id: "burruss-hall",
    name: "Burruss Hall",
    updatedAt: "2026-09-19T07:00:00.000Z",
    location: {
      address: "800 Drillfield Drive, Blacksburg, VA 24061",
      longitude: -80.42351,
      latitude: 37.22883,
      source: "curated"
    },
    footprint: {
      feature: {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-80.42412, 37.22914],
              [-80.42292, 37.22914],
              [-80.42292, 37.22893],
              [-80.42265, 37.22893],
              [-80.42265, 37.22863],
              [-80.42439, 37.22863],
              [-80.42439, 37.22893],
              [-80.42412, 37.22893],
              [-80.42412, 37.22914]
            ]
          ]
        },
        properties: {
          scene_id: "burruss-hall",
          source: "curated"
        }
      },
      source: "curated",
      widthM: 154,
      depthM: 57,
      bearingDeg: 0
    },
    evidence: [
      {
        id: "burruss-photo-01",
        origin: "curated",
        claim: "observed",
        title: "Burruss Hall drillfield view",
        uri: "/demo-assets/burruss-hall/burruss-hall.jpg",
        alt: "Burruss Hall at Virginia Tech viewed across the Drillfield.",
        capturedAt: "2007-04-17",
        attribution: {
          creator: "Waldo Jaquith",
          sourcePageUrl: "https://commons.wikimedia.org/wiki/File:Burruss_Hall.jpg",
          license: "CC BY-SA 2.0",
          licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/",
          retrievedAt,
          changes: "Downloaded via Wikimedia Commons thumbnail redirect at 960px width."
        }
      }
    ],
    building: {
      buildingType: "institutional",
      floors: 5,
      heightM: 30,
      material: "brick",
      roofType: "flat",
      windowPattern: "regular",
      entrancePosition: "south"
    },
    scenario: {
      activeMode: "base",
      scorched: {
        decayIntensity: 0.35,
        scorchIntensity: 0.42,
        overgrowthIntensity: 0.2,
        boardedWindowRatio: 0.25,
        debrisDensity: 0.2,
        gameplayTags: ["landmark", "campus-core"]
      },
      disaster: {
        status: "simulated",
        damageType: "none",
        severity: 0,
        accessStatus: "open",
        hazards: [],
        responderNote: "Curated normal-photo example; no observed damage claim."
      }
    },
    confidence: {
      overall: 0.86,
      location: 0.95,
      footprint: 0.78,
      traits: 0.84
    },
    assumptions: [
      {
        id: "burruss-assumption-height",
        claim: "Height is estimated from public building profile and visible floors.",
        affectedPath: "building.heightM",
        evidenceClaim: "assumed",
        rationale: "The curated photo does not provide a measurable facade scale."
      },
      {
        id: "burruss-assumption-rear",
        claim: "Rear facade rhythm is represented from the front-facing evidence.",
        affectedPath: "building.windowPattern",
        evidenceClaim: "assumed",
        rationale: "Only one curated source image is available in this phase."
      }
    ],
    provenance: [
      {
        id: "burruss-prov-photo",
        target: "evidence.burruss-photo-01",
        source: "photo-attribution",
        claim: "observed",
        label: "Wikimedia Commons photo attribution",
        evidenceIds: ["burruss-photo-01"]
      },
      {
        id: "burruss-prov-location",
        target: "location",
        source: "curated",
        claim: "observed",
        label: "Curated from public address and coordinate references",
        evidenceIds: ["burruss-photo-01"]
      }
    ]
  },
  {
    schemaVersion: 1,
    id: "willard-building",
    name: "Willard Building",
    updatedAt: "2026-09-19T07:00:00.000Z",
    location: {
      address: "640 Pollock Road, University Park, PA 16802",
      longitude: -77.86437,
      latitude: 40.79576,
      source: "curated"
    },
    footprint: {
      feature: {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [-77.86496, 40.79598],
              [-77.86388, 40.79598],
              [-77.86388, 40.79554],
              [-77.86496, 40.79554],
              [-77.86496, 40.79598]
            ]
          ]
        },
        properties: {
          scene_id: "willard-building",
          source: "curated"
        }
      },
      source: "curated",
      widthM: 91,
      depthM: 49,
      bearingDeg: 0
    },
    evidence: [
      {
        id: "willard-photo-01",
        origin: "curated",
        claim: "observed",
        title: "Willard Building east view",
        uri: "/demo-assets/willard-building/willard-building-east.jpg",
        alt: "East view of the Willard Building at Pennsylvania State University.",
        capturedAt: "2022-04-24",
        attribution: {
          creator: "JohnDziak",
          sourcePageUrl:
            "https://commons.wikimedia.org/wiki/File:Willard_Building_Penn_State_East_View.jpg",
          license: "CC0 1.0",
          licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
          retrievedAt,
          changes: "Downloaded via Wikimedia Commons thumbnail redirect at 960px width."
        }
      }
    ],
    building: {
      buildingType: "academic",
      floors: 3,
      heightM: 17,
      material: "concrete",
      roofType: "gable",
      windowPattern: "vertical-bands",
      entrancePosition: "east"
    },
    scenario: {
      activeMode: "base",
      scorched: {
        decayIntensity: 0.28,
        scorchIntensity: 0.3,
        overgrowthIntensity: 0.18,
        boardedWindowRatio: 0.18,
        debrisDensity: 0.16,
        gameplayTags: ["academic", "rectangular-block"]
      },
      disaster: {
        status: "simulated",
        damageType: "none",
        severity: 0,
        accessStatus: "open",
        hazards: [],
        responderNote: "Curated normal-photo example; no observed damage claim."
      }
    },
    confidence: {
      overall: 0.83,
      location: 0.92,
      footprint: 0.8,
      traits: 0.78
    },
    assumptions: [
      {
        id: "willard-assumption-height",
        claim: "Height is estimated from visible floors and campus building context.",
        affectedPath: "building.heightM",
        evidenceClaim: "assumed",
        rationale: "The curated image is perspective-correct enough for traits but not measurement."
      },
      {
        id: "willard-assumption-depth",
        claim: "Footprint depth is simplified to a rectangular mass for the catalog seed.",
        affectedPath: "footprint.depthM",
        evidenceClaim: "assumed",
        rationale: "Detailed parcel geometry is deferred until the map and footprint phases."
      }
    ],
    provenance: [
      {
        id: "willard-prov-photo",
        target: "evidence.willard-photo-01",
        source: "photo-attribution",
        claim: "observed",
        label: "Wikimedia Commons photo attribution",
        evidenceIds: ["willard-photo-01"]
      },
      {
        id: "willard-prov-location",
        target: "location",
        source: "curated",
        claim: "observed",
        label: "Curated from public address and coordinate references",
        evidenceIds: ["willard-photo-01"]
      }
    ]
  }
] satisfies SceneProject[];

export const demoScenes = rawDemoScenes.map((scene) => sceneProjectSchema.parse(scene));

export const defaultDemoSceneId = demoScenes[0].id;

export function getDemoSceneById(id: string) {
  return demoScenes.find((scene) => scene.id === id);
}

export function getDemoSceneSummaries() {
  return demoScenes.map((scene) => ({
    id: scene.id,
    name: scene.name,
    address: scene.location.address,
    thumbnailUri: scene.evidence[0].uri,
    updatedAt: scene.updatedAt
  }));
}
