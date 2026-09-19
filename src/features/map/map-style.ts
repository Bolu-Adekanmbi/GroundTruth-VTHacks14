import type { StyleSpecification } from "maplibre-gl";

export const OSM_ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>';

export const defaultMapStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: OSM_ATTRIBUTION,
      maxzoom: 19
    }
  },
  layers: [
    {
      id: "osm-raster",
      type: "raster",
      source: "osm"
    }
  ]
};

export function getConfiguredMapStyle() {
  return import.meta.env.VITE_MAP_STYLE_URL || defaultMapStyle;
}
