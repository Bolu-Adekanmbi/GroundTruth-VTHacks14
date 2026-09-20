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
              [-80.4242692, 37.2290902], [-80.4243794, 37.2291849],
              [-80.4243357, 37.2292171], [-80.4243206, 37.2292042],
              [-80.4241477, 37.2293317], [-80.4241626, 37.2293444],
              [-80.4240634, 37.2294176], [-80.4240452, 37.229402],
              [-80.4238818, 37.2295225], [-80.4238935, 37.2295326],
              [-80.4238627, 37.2295553], [-80.4237138, 37.2294273],
              [-80.4236928, 37.2294427], [-80.4236592, 37.2294137],
              [-80.4236761, 37.2294012], [-80.4234038, 37.2291671],
              [-80.4233708, 37.2291914], [-80.4232384, 37.2290776],
              [-80.4231933, 37.2290389], [-80.4231887, 37.2290422],
              [-80.4231069, 37.2289719], [-80.423347, 37.2287948],
              [-80.4232873, 37.2287434], [-80.4233374, 37.2287065],
              [-80.4233916, 37.2286665], [-80.42345, 37.2287167],
              [-80.423691, 37.2285389], [-80.4238217, 37.2286498],
              [-80.4239846, 37.2287913], [-80.4239495, 37.2288171],
              [-80.4240785, 37.228928], [-80.4242167, 37.2290468],
              [-80.4242374, 37.2290645], [-80.4242536, 37.2290771],
              [-80.4242692, 37.2290902]
            ]
          ]
        },
        properties: {
          scene_id: "burruss-hall",
          source: "osm",
          osm_relation_id: 1074686,
          osm_name: "Burruss Hall"
        }
      },
      source: "osm",
      widthM: 113,
      depthM: 113,
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
      facadeColor: "#817d72",
      roofType: "flat",
      windowPattern: "regular",
      entrancePosition: "south",
      facadeModules: ["tower"]
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
        responderNote: ""
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
      },
      {
        id: "burruss-assumption-footprint",
        claim: "OSM multipolygon geometry is used as the ground-plan source and should be reviewed against current imagery.",
        affectedPath: "footprint",
        evidenceClaim: "inferred",
        rationale: "The OSM building relation is authoritative for the 3D base mass but remains community-maintained map data."
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
      },
      {
        id: "burruss-prov-footprint",
        target: "footprint",
        source: "osm",
        claim: "inferred",
        label: "OpenStreetMap relation 1074686 building geometry",
        evidenceIds: []
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
              [-77.8649759, 40.7956725], [-77.8646317, 40.7959296],
              [-77.8645478, 40.7958651], [-77.8644233, 40.7959579],
              [-77.8644521, 40.79598], [-77.8642684, 40.796117],
              [-77.8640529, 40.7959514], [-77.8640302, 40.7959683],
              [-77.8639893, 40.7959369], [-77.8639484, 40.7959054],
              [-77.8639711, 40.7958884], [-77.8637551, 40.7957224],
              [-77.8639387, 40.7955855], [-77.8639855, 40.7956214],
              [-77.8640482, 40.7955746], [-77.8641261, 40.7956344],
              [-77.8640804, 40.7956684], [-77.8641404, 40.7957145],
              [-77.8641235, 40.7957271], [-77.86434, 40.7958935],
              [-77.8644572, 40.7957949], [-77.8642921, 40.7956681],
              [-77.8646356, 40.7954109], [-77.8649759, 40.7956725]
            ]
          ]
        },
        properties: {
          scene_id: "willard-building",
          source: "osm",
          osm_way_id: 431324439,
          osm_name: "Willard Building"
        }
      },
      source: "osm",
      widthM: 103,
      depthM: 78,
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
      roofType: "flat",
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
        responderNote: ""
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
        claim: "OSM building geometry is used as the ground-plan source and should be reviewed against current imagery.",
        affectedPath: "footprint.depthM",
        evidenceClaim: "inferred",
        rationale: "The OSM building way has more detailed geometry than the prior rectangular demo mass, but it remains community-maintained map data."
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
      },
      {
        id: "willard-prov-footprint",
        target: "footprint",
        source: "osm",
        claim: "inferred",
        label: "OpenStreetMap way 431324439 building geometry",
        evidenceIds: []
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
