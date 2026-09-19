import { demoScenes, getDemoSceneById } from "../../shared/demo-scenes.js";
import {
  createRectangleFootprint,
  getApproximateDimensionsM,
  normalizeBearing,
  type LngLat
} from "../../shared/geo.js";
import type { FootprintRequest, FootprintResult, GeocodeResult } from "../../shared/api-schema.js";

export interface GisAdapterOptions {
  fetcher?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}

interface NominatimPlace {
  display_name?: string;
  lat?: string;
  lon?: string;
}

interface OverpassElement {
  type: "way" | "relation" | "node";
  tags?: Record<string, string>;
  geometry?: Array<{ lon: number; lat: number }>;
}

const geocodeCache = new Map<string, GeocodeResult>();
const footprintCache = new Map<string, FootprintResult>();
const requestTimeoutMs = 3_500;
const defaultUserAgent = "GroundTruth-VTHacks14/0.1 demo GIS adapter";

export async function geocodeAddress(
  address: string,
  options: GisAdapterOptions = {}
): Promise<{ result?: GeocodeResult; warnings: string[]; source: "curated" | "live" | "fallback" }> {
  const normalized = normalizeAddress(address);
  const curated = demoScenes.find((scene) => normalizeAddress(scene.location.address) === normalized);

  if (curated) {
    return {
      result: {
        address: curated.location.address,
        longitude: curated.location.longitude,
        latitude: curated.location.latitude,
        source: "curated",
        confidence: curated.confidence.location
      },
      warnings: [],
      source: "curated"
    };
  }

  if (!isLiveGisEnabled(options.env)) {
    return {
      warnings: ["Live geocoding is disabled; use manual map placement."],
      source: "fallback"
    };
  }

  const cached = geocodeCache.get(normalized);

  if (cached) {
    return { result: cached, warnings: ["Geocode result served from session cache."], source: "live" };
  }

  const fetcher = options.fetcher ?? fetch;
  const url = new URL(options.env?.GROUNDTRUTH_NOMINATIM_URL ?? "https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "1");
  url.searchParams.set("q", address);

  try {
    const response = await fetchWithTimeout(fetcher, url, options.env);

    if (!response.ok) {
      return {
        warnings: [`Live geocoder returned HTTP ${response.status}; use manual placement.`],
        source: "fallback"
      };
    }

    const places = (await response.json()) as NominatimPlace[];
    const place = places[0];
    const longitude = Number(place?.lon);
    const latitude = Number(place?.lat);

    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
      return {
        warnings: ["Live geocoder found no usable result; use manual placement."],
        source: "fallback"
      };
    }

    const result = {
      address: place?.display_name ?? address,
      longitude,
      latitude,
      source: "geocoder" as const,
      confidence: 0.62
    };
    geocodeCache.set(normalized, result);

    return {
      result,
      warnings: [
        "Live geocoding uses a policy-limited provider; result is cached and should be reviewed."
      ],
      source: "live"
    };
  } catch {
    return {
      warnings: ["Live geocoder timed out or failed; use manual placement."],
      source: "fallback"
    };
  }
}

export async function lookupFootprint(
  request: FootprintRequest,
  options: GisAdapterOptions = {}
): Promise<{ result: FootprintResult; warnings: string[]; source: "curated" | "live" | "fallback" }> {
  const curated = request.sceneId ? getDemoSceneById(request.sceneId) : findCuratedByAddress(request.address);

  if (curated) {
    return {
      result: {
        feature: curated.footprint.feature,
        source: curated.footprint.source === "osm" ? "osm" : "curated",
        widthM: curated.footprint.widthM,
        depthM: curated.footprint.depthM,
        bearingDeg: curated.footprint.bearingDeg,
        confidence: curated.confidence.footprint
      },
      warnings: [],
      source: "curated"
    };
  }

  const center: LngLat = [request.longitude, request.latitude];

  if (isLiveGisEnabled(options.env)) {
    const cacheKey = `${center[0].toFixed(5)},${center[1].toFixed(5)}`;
    const cached = footprintCache.get(cacheKey);

    if (cached) {
      return { result: cached, warnings: ["OSM footprint served from session cache."], source: "live" };
    }

    const osmFootprint = await lookupOsmFootprint(center, options);

    if (osmFootprint) {
      footprintCache.set(cacheKey, osmFootprint);

      return {
        result: osmFootprint,
        warnings: ["OSM building geometry should be reviewed against source evidence."],
        source: "live"
      };
    }
  }

  const feature = {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [
        createRectangleFootprint({
          center,
          widthM: request.widthM,
          depthM: request.depthM,
          bearingDeg: request.bearingDeg
        })
      ]
    },
    properties: {
      scene_id: "custom-session",
      source: "manual-rectangle"
    }
  };

  return {
    result: {
      feature,
      source: "manual-rectangle",
      widthM: request.widthM,
      depthM: request.depthM,
      bearingDeg: normalizeBearing(request.bearingDeg),
      confidence: 0.2
    },
    warnings: ["No live footprint was used; editable manual rectangle created."],
    source: "fallback"
  };
}

function findCuratedByAddress(address?: string) {
  if (!address) {
    return undefined;
  }

  const normalized = normalizeAddress(address);
  return demoScenes.find((scene) => normalizeAddress(scene.location.address) === normalized);
}

async function lookupOsmFootprint(center: LngLat, options: GisAdapterOptions) {
  const fetcher = options.fetcher ?? fetch;
  const url = new URL(options.env?.GROUNDTRUTH_OVERPASS_URL ?? "https://overpass-api.de/api/interpreter");
  const query = `[out:json][timeout:3];way(around:85,${center[1]},${center[0]})["building"];out geom 5;`;
  url.searchParams.set("data", query);

  try {
    const response = await fetchWithTimeout(fetcher, url, options.env);

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as { elements?: OverpassElement[] };
    const way = payload.elements?.find((element) => element.type === "way" && element.geometry?.length);

    if (!way?.geometry || way.geometry.length < 4) {
      return undefined;
    }

    const openRing = way.geometry.map((coordinate) => [coordinate.lon, coordinate.lat] satisfies LngLat);
    const ring = [...openRing, openRing[0]];
    const dimensions = getApproximateDimensionsM(ring);

    return {
      feature: {
        type: "Feature" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [ring]
        },
        properties: {
          scene_id: "custom-session",
          source: "osm",
          osm_name: way.tags?.name ?? null
        }
      },
      source: "osm" as const,
      widthM: Math.max(1, Math.round(dimensions.widthM)),
      depthM: Math.max(1, Math.round(dimensions.depthM)),
      bearingDeg: 0,
      confidence: 0.7
    };
  } catch {
    return undefined;
  }
}

async function fetchWithTimeout(fetcher: typeof fetch, url: URL, env: NodeJS.ProcessEnv = process.env) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    return await fetcher(url, {
      headers: {
        "User-Agent": env.GROUNDTRUTH_GIS_USER_AGENT ?? defaultUserAgent,
        Referer: env.GROUNDTRUTH_GIS_REFERER ?? "http://localhost:5173"
      },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function isLiveGisEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.GROUNDTRUTH_ENABLE_LIVE_GIS === "true";
}

function normalizeAddress(address: string) {
  return address.trim().toLowerCase().replaceAll(/\s+/g, " ");
}
