import { useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  ScaleControl,
  type MapLayerMouseEvent,
  type MapRef
} from "react-map-gl/maplibre";
import type { GeoJSONSource } from "maplibre-gl";
import type { SceneProject } from "../../../shared/scene-schema";
import {
  formatCoordinate,
  getBounds,
  getBoundsArray,
  getOuterRing,
  getProjectCentroid,
  normalizeBearing,
  type LngLat
} from "../../../shared/geo";
import { getConfiguredMapStyle } from "./map-style";

interface GisMapProps {
  project: SceneProject;
  onSetManualLocation?: (coordinate: LngLat) => void;
}

const fitPadding = { top: 72, right: 72, bottom: 72, left: 72 };
const footprintSourceId = "active-footprint";
const footprintLayerIds = [
  "active-footprint-fill",
  "active-footprint-casing",
  "active-footprint-outline"
];

export function GisMap({ project, onSetManualLocation }: GisMapProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapWarning, setMapWarning] = useState("");
  const [cursorCoordinate, setCursorCoordinate] = useState<LngLat | null>(null);
  const centroid = useMemo(() => getProjectCentroid(project), [project]);
  const bounds = useMemo(() => getBounds(getOuterRing(project)), [project]);
  const selectedProjectIdRef = useRef("");
  const style = useMemo(() => getConfiguredMapStyle(), []);
  const displayCoordinate = cursorCoordinate ?? centroid;
  const disaster = project.scenario.activeMode === "disaster" ? project.scenario.disaster : null;
  const hasOperationalMarker = Boolean(
    disaster && (disaster.damageType !== "none" || disaster.hazards.length > 0 || disaster.accessStatus === "blocked" || disaster.blockedEntrances?.includes("primary"))
  );

  useEffect(() => {
    if (!isMapReady) {
      return;
    }

    const map = mapRef.current?.getMap();

    if (!map) {
      return;
    }

    if (map.getSource(footprintSourceId)) {
      void (map.getSource(footprintSourceId) as GeoJSONSource).setData(project.footprint.feature);
    } else {
      map.addSource(footprintSourceId, {
        type: "geojson",
        data: project.footprint.feature
      });
    }

    if (!map.getLayer("active-footprint-fill")) {
      map.addLayer({
        id: "active-footprint-fill",
        type: "fill",
        source: footprintSourceId,
        paint: { "fill-color": "#19778a", "fill-opacity": 0.42 }
      });
    }

    if (!map.getLayer("active-footprint-casing")) {
      map.addLayer({
        id: "active-footprint-casing",
        type: "line",
        source: footprintSourceId,
        paint: { "line-color": "#ffffff", "line-opacity": 0.94, "line-width": 8 }
      });
    }

    if (!map.getLayer("active-footprint-outline")) {
      map.addLayer({
        id: "active-footprint-outline",
        type: "line",
        source: footprintSourceId,
        paint: { "line-color": "#0b5361", "line-width": 4 }
      });
    }

    footprintLayerIds.forEach((layerId) => {
      if (map.getLayer(layerId)) {
        void map.moveLayer(layerId);
      }
    });

    if (selectedProjectIdRef.current !== project.id) {
      selectedProjectIdRef.current = project.id;
      map.fitBounds(getBoundsArray(bounds), {
        padding: fitPadding,
        duration: 0,
        maxZoom: 18
      });
    }
  }, [bounds, isMapReady, project.footprint.feature, project.id]);

  function handleMouseMove(event: MapLayerMouseEvent) {
    setCursorCoordinate([event.lngLat.lng, event.lngLat.lat]);
  }

  function handleClick(event: MapLayerMouseEvent) {
    onSetManualLocation?.([event.lngLat.lng, event.lngLat.lat]);
  }

  return (
    <div aria-label="GIS map with active footprint" className="gis-map-stage">
      <Map
        ref={mapRef}
        attributionControl={{ compact: true }}
        initialViewState={{
          longitude: centroid[0],
          latitude: centroid[1],
          zoom: 17,
          bearing: normalizeBearing(project.footprint.bearingDeg),
          pitch: 0
        }}
        mapStyle={style}
        style={{ position: "absolute", inset: 0 }}
        maxPitch={0}
        minZoom={2}
        onError={() => {
          setMapWarning("Basemap tiles are unavailable; footprint and GIS state remain visible.");
        }}
        onLoad={() => setIsMapReady(true)}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        reuseMaps
      >
        <NavigationControl position="top-left" visualizePitch={false} />
        <ScaleControl position="bottom-left" unit="metric" />
        <Marker anchor="center" latitude={centroid[1]} longitude={centroid[0]}>
          <span aria-label="Selected footprint centroid" className="map-centroid-marker" />
        </Marker>
        {hasOperationalMarker ? (
          <Marker anchor="bottom" latitude={centroid[1]} longitude={centroid[0]}>
            <span aria-label="Disaster operational conditions" className="map-disaster-marker">!</span>
          </Marker>
        ) : null}
      </Map>

      <div className="north-indicator" aria-label="North indicator">
        N
      </div>
      <div className="coordinate-readout" aria-live="polite">
        <span>{cursorCoordinate ? "Cursor" : "Footprint"}</span>
        <code>{formatCoordinate(displayCoordinate)}</code>
      </div>
      <div
        aria-label={`Footprint orientation ${Math.round(project.footprint.bearingDeg)} degrees`}
        className="orientation-cue"
        style={{ transform: `rotate(${normalizeBearing(project.footprint.bearingDeg)}deg)` }}
      >
        <span />
      </div>
      {mapWarning ? <div className="map-warning">{mapWarning}</div> : null}
      {disaster ? (
        <div className="map-disaster-legend" aria-label="Disaster map legend">
          <span><i /> Operational conditions</span>
          <strong>{disaster.status}</strong>
        </div>
      ) : null}
    </div>
  );
}
