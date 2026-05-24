"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GeoJSONSource, LngLatBoundsLike, Map as MapboxMap, Marker, StyleSpecification } from "mapbox-gl";
import { AlertTriangle, Boxes, Building2, Compass, Expand, LoaderCircle, Minimize2, Move3D, RefreshCcw, ZoomIn } from "lucide-react";
import {
  getUrbanBuildingAddressLine,
  getUrbanBuildingDisplayLabel,
  getUrbanBuildingMapLabel,
} from "@/lib/urbanContext";
import type { Incident, UrbanBuildingContext, UrbanBuildingSelectionOptions } from "@/types";

interface Props {
  incident: Incident | null;
  buildings: UrbanBuildingContext[];
  loading: boolean;
  error: string | null;
  isFallback: boolean;
  source: string;
  selectedBuildingId: string | null;
  onSelectBuilding?: (buildingId: string, options?: UrbanBuildingSelectionOptions) => void;
  onRefresh?: () => void | Promise<void>;
}

type BuildingFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      id: string;
      label: string;
      displayLabel: string;
      address: string;
      height: number;
      isIncidentBuilding: boolean;
      isSelected: boolean;
    };
    geometry: {
      type: "Polygon";
      coordinates: [number, number][][];
    };
  }>;
};

type IncidentFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: {
      description: string;
    };
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
  }>;
};

const BUILDING_SOURCE_ID = "urban-context-buildings";
const INCIDENT_SOURCE_ID = "urban-context-incident";
const BUILDING_EXTRUSION_LAYER_ID = "urban-context-buildings-3d";
const BUILDING_FOOTPRINT_LAYER_ID = "urban-context-buildings-footprints";
const INCIDENT_GLOW_LAYER_ID = "urban-context-incident-glow";
const INCIDENT_POINT_LAYER_ID = "urban-context-incident-point";

const EMPTY_BUILDING_COLLECTION: BuildingFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const EMPTY_INCIDENT_COLLECTION: IncidentFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

const ONE_MAP_STYLE = {
  version: 8,
  name: "SCDF Urban Context 3D",
  sources: {
    onemap: {
      type: "raster",
      attribution: "Map tiles by OneMap Singapore",
      tiles: ["https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png"],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "onemap-base",
      type: "raster",
      source: "onemap",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
} satisfies StyleSpecification;

function closePolygonRing(points: [number, number][]) {
  if (points.length < 3) return null;

  const ring = points.map(([lng, lat]) => [lng, lat] as [number, number]);
  const [firstLng, firstLat] = ring[0];
  const [lastLng, lastLat] = ring[ring.length - 1];

  if (firstLng !== lastLng || firstLat !== lastLat) {
    ring.push([firstLng, firstLat]);
  }

  return ring;
}

function buildBuildingFeatureCollection(buildings: UrbanBuildingContext[], selectedBuildingId: string | null): BuildingFeatureCollection {
  return {
    type: "FeatureCollection",
    features: buildings.flatMap((building) => {
      const ring = closePolygonRing(building.coordinates);
      if (!ring) return [];

      return [{
        type: "Feature",
        properties: {
          id: building.id,
          label: getUrbanBuildingMapLabel(building),
          displayLabel: getUrbanBuildingDisplayLabel(building),
          address: getUrbanBuildingAddressLine(building) ?? "Address not available",
          height: Math.max(building.estimatedHeight, 12),
          isIncidentBuilding: building.isLikelyIncidentBuilding,
          isSelected: building.id === selectedBuildingId,
        },
        geometry: {
          type: "Polygon",
          coordinates: [ring],
        },
      }];
    }),
  };
}

function buildIncidentFeatureCollection(incident: Incident | null): IncidentFeatureCollection {
  if (!incident) return EMPTY_INCIDENT_COLLECTION;

  return {
    type: "FeatureCollection",
    features: [{
      type: "Feature",
      properties: {
        description: incident.desc,
      },
      geometry: {
        type: "Point",
        coordinates: [incident.lng, incident.lat],
      },
    }],
  };
}

function getSceneBounds(buildings: UrbanBuildingContext[], incident: Incident | null): LngLatBoundsLike | null {
  const points = buildings.flatMap((building) => building.coordinates);
  if (incident) points.push([incident.lng, incident.lat]);
  if (!points.length) return null;

  let minLng = points[0][0];
  let maxLng = points[0][0];
  let minLat = points[0][1];
  let maxLat = points[0][1];

  for (const [lng, lat] of points) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  const lngPadding = Math.max((maxLng - minLng) * 0.2, 0.00028);
  const latPadding = Math.max((maxLat - minLat) * 0.2, 0.00028);

  return [
    [minLng - lngPadding, minLat - latPadding],
    [maxLng + lngPadding, maxLat + latPadding],
  ];
}

function createBuildingLabelElement(
  building: UrbanBuildingContext,
  isSelected: boolean,
  onSelect: (buildingId: string) => void,
) {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = getUrbanBuildingMapLabel(building);
  element.setAttribute("aria-label", `Focus ${getUrbanBuildingDisplayLabel(building)}`);

  const baseClassName = "rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide shadow-[0_10px_24px_rgba(15,23,42,0.24)] backdrop-blur transition-transform hover:-translate-y-0.5";
  if (building.isLikelyIncidentBuilding && isSelected) {
    element.className = `${baseClassName} border-rose-200 bg-rose-500/95 text-white ring-2 ring-amber-200/80`;
  } else if (building.isLikelyIncidentBuilding) {
    element.className = `${baseClassName} border-rose-200 bg-rose-500/92 text-white`;
  } else if (isSelected) {
    element.className = `${baseClassName} border-amber-200 bg-amber-400/95 text-slate-950`;
  } else {
    element.className = `${baseClassName} border-slate-200/80 bg-slate-950/82 text-white`;
  }

  element.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelect(building.id);
  });

  return element;
}

function getBuildingLabelPriority(building: UrbanBuildingContext, selectedBuildingId: string | null) {
  if (building.id === selectedBuildingId && building.isLikelyIncidentBuilding) return 0;
  if (building.id === selectedBuildingId) return 1;
  if (building.isLikelyIncidentBuilding) return 2;
  return 3;
}

export default function UrbanIncident3D({
  incident,
  buildings,
  loading,
  error,
  isFallback,
  selectedBuildingId,
  onSelectBuilding,
  onRefresh,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl").default | null>(null);
  const labelMarkersRef = useRef<Marker[]>([]);
  const lastSceneKeyRef = useRef<string | null>(null);
  const lastFocusedBuildingIdRef = useRef<string | null>(null);
  const latestSelectBuildingRef = useRef<typeof onSelectBuilding>(onSelectBuilding);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneError, setSceneError] = useState<string | null>(null);

  useEffect(() => {
    latestSelectBuildingRef.current = onSelectBuilding;
  }, [onSelectBuilding]);

  const effectiveSelectedBuilding = useMemo(
    () => buildings.find((building) => building.id === selectedBuildingId) ?? null,
    [buildings, selectedBuildingId],
  );
  const effectiveSelectedBuildingId = effectiveSelectedBuilding?.id ?? null;
  const incidentBuilding = useMemo(
    () => buildings.find((building) => building.isLikelyIncidentBuilding)
      ?? effectiveSelectedBuilding
      ?? null,
    [buildings, effectiveSelectedBuilding],
  );
  const sceneBuildings = useMemo(
    () => buildBuildingFeatureCollection(buildings, effectiveSelectedBuildingId),
    [buildings, effectiveSelectedBuildingId],
  );
  const sceneIncident = useMemo(
    () => buildIncidentFeatureCollection(incident),
    [incident],
  );
  const sceneBounds = useMemo(
    () => getSceneBounds(buildings, incident),
    [buildings, incident],
  );
  const sceneKey = useMemo(
    () => `${incident?.id ?? "no-incident"}:${buildings.map((building) => building.id).join("|")}`,
    [incident?.id, buildings],
  );
  const labelBuildings = useMemo(() => {
    const maxVisibleLabels = isFullscreen ? 6 : 3;

    return [...buildings]
      .sort((left, right) => {
        const priorityDifference = getBuildingLabelPriority(left, effectiveSelectedBuildingId)
          - getBuildingLabelPriority(right, effectiveSelectedBuildingId);

        if (priorityDifference !== 0) return priorityDifference;
        if (left.distanceFromIncidentMeters !== right.distanceFromIncidentMeters) {
          return left.distanceFromIncidentMeters - right.distanceFromIncidentMeters;
        }
        return getUrbanBuildingDisplayLabel(left).localeCompare(getUrbanBuildingDisplayLabel(right));
      })
      .slice(0, maxVisibleLabels);
  }, [buildings, effectiveSelectedBuildingId, isFullscreen]);

  function clearLabelMarkers() {
    for (const marker of labelMarkersRef.current) {
      marker.remove();
    }
    labelMarkersRef.current = [];
  }

  function syncLabelMarkers() {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl) return;

    clearLabelMarkers();

    for (const building of labelBuildings) {
      const element = createBuildingLabelElement(
        building,
        building.id === effectiveSelectedBuildingId,
        (buildingId) => latestSelectBuildingRef.current?.(buildingId, { focusMap: true }),
      );

      const marker = new mapboxgl.Marker({
        element,
        anchor: "bottom",
        offset: [0, -12],
      })
        .setLngLat([building.centroid.lng, building.centroid.lat])
        .addTo(map);

      labelMarkersRef.current.push(marker);
    }
  }

  useEffect(() => {
    function handleFullscreenChange() {
      const nextIsFullscreen = document.fullscreenElement === rootRef.current;
      setIsFullscreen(nextIsFullscreen);
      window.setTimeout(() => {
        mapRef.current?.resize();
      }, 120);
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!incident || !containerRef.current) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    setSceneReady(false);
    setSceneError(null);
    lastSceneKeyRef.current = null;
    lastFocusedBuildingIdRef.current = null;

    void (async () => {
      try {
        const mapboxModule = await import("mapbox-gl");
        const mapboxgl = mapboxModule.default;

        if (cancelled || !containerRef.current) return;
        if (!mapboxgl.supported()) {
          setSceneError("Interactive 3D view is not supported in this browser.");
          return;
        }

        mapboxRef.current = mapboxgl;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: ONE_MAP_STYLE,
          center: [incident.lng, incident.lat],
          zoom: 17.2,
          pitch: 62,
          bearing: -24,
          antialias: true,
        });

        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: true }), "bottom-right");

        map.on("load", () => {
          if (cancelled) return;

          map.addSource(BUILDING_SOURCE_ID, {
            type: "geojson",
            data: EMPTY_BUILDING_COLLECTION,
          });
          map.addSource(INCIDENT_SOURCE_ID, {
            type: "geojson",
            data: EMPTY_INCIDENT_COLLECTION,
          });

          map.addLayer({
            id: BUILDING_EXTRUSION_LAYER_ID,
            type: "fill-extrusion",
            source: BUILDING_SOURCE_ID,
            paint: {
              "fill-extrusion-base": 0,
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-color": [
                "case",
                ["all", ["get", "isIncidentBuilding"], ["get", "isSelected"]],
                "#fb7185",
                ["get", "isIncidentBuilding"],
                "#f43f5e",
                ["get", "isSelected"],
                "#f59e0b",
                "#38bdf8",
              ],
              "fill-extrusion-opacity": 0.92,
              "fill-extrusion-vertical-gradient": true,
            },
          });

          map.addLayer({
            id: BUILDING_FOOTPRINT_LAYER_ID,
            type: "line",
            source: BUILDING_SOURCE_ID,
            paint: {
              "line-color": [
                "case",
                ["all", ["get", "isIncidentBuilding"], ["get", "isSelected"]],
                "#ffe4e6",
                ["get", "isIncidentBuilding"],
                "#fecdd3",
                ["get", "isSelected"],
                "#fde68a",
                "#bfdbfe",
              ],
              "line-width": [
                "case",
                ["all", ["get", "isIncidentBuilding"], ["get", "isSelected"]],
                3.5,
                ["any", ["get", "isIncidentBuilding"], ["get", "isSelected"]],
                2.8,
                1.4,
              ],
              "line-opacity": 0.95,
            },
          });

          map.addLayer({
            id: INCIDENT_GLOW_LAYER_ID,
            type: "circle",
            source: INCIDENT_SOURCE_ID,
            paint: {
              "circle-radius": 18,
              "circle-color": "#fb7185",
              "circle-opacity": 0.18,
            },
          });

          map.addLayer({
            id: INCIDENT_POINT_LAYER_ID,
            type: "circle",
            source: INCIDENT_SOURCE_ID,
            paint: {
              "circle-radius": 6,
              "circle-color": "#f43f5e",
              "circle-stroke-width": 2,
              "circle-stroke-color": "#fff1f2",
            },
          });

          map.on("mouseenter", BUILDING_EXTRUSION_LAYER_ID, () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", BUILDING_EXTRUSION_LAYER_ID, () => {
            map.getCanvas().style.cursor = "";
          });
          map.on("click", BUILDING_EXTRUSION_LAYER_ID, (event) => {
            const buildingId = event.features?.[0]?.properties?.id;
            if (typeof buildingId === "string") {
              latestSelectBuildingRef.current?.(buildingId, { focusMap: true });
            }
          });

          setSceneReady(true);
        });

        map.on("error", (event) => {
          if (cancelled) return;
          const message = event.error?.message ?? "3D scene could not load.";
          if (!message.toLowerCase().includes("aborted")) {
            setSceneError(message);
          }
        });

        resizeObserver = new ResizeObserver(() => {
          map.resize();
        });
        resizeObserver.observe(containerRef.current);
      } catch (caughtError) {
        if (!cancelled) {
          setSceneError(
            caughtError instanceof Error
              ? caughtError.message
              : "Interactive 3D scene could not be initialized.",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      clearLabelMarkers();
      mapRef.current?.remove();
      mapRef.current = null;
      mapboxRef.current = null;
      setSceneReady(false);
    };
  }, [incident?.desc, incident?.id, incident?.lat, incident?.lng]);

  useEffect(() => {
    if (!sceneReady || !mapRef.current) return;

    const map = mapRef.current;
    const buildingSource = map.getSource(BUILDING_SOURCE_ID) as GeoJSONSource | undefined;
    const incidentSource = map.getSource(INCIDENT_SOURCE_ID) as GeoJSONSource | undefined;

    buildingSource?.setData(sceneBuildings);
    incidentSource?.setData(sceneIncident);
    syncLabelMarkers();

    if (sceneKey !== lastSceneKeyRef.current) {
      if (sceneBounds) {
        map.fitBounds(sceneBounds, {
          padding: 52,
          duration: 1200,
          pitch: 62,
          bearing: -24,
        });
      } else if (incident) {
        map.flyTo({
          center: [incident.lng, incident.lat],
          zoom: 17.2,
          pitch: 62,
          bearing: -24,
          duration: 1000,
        });
      }

      lastSceneKeyRef.current = sceneKey;
      lastFocusedBuildingIdRef.current = effectiveSelectedBuildingId;
      return;
    }

    if (
      effectiveSelectedBuilding
      && effectiveSelectedBuilding.id !== lastFocusedBuildingIdRef.current
    ) {
      map.flyTo({
        center: [effectiveSelectedBuilding.centroid.lng, effectiveSelectedBuilding.centroid.lat],
        zoom: Math.max(map.getZoom(), 17.6),
        pitch: Math.max(map.getPitch(), 60),
        bearing: map.getBearing() === 0 ? -24 : map.getBearing(),
        duration: 900,
        essential: true,
      });
      lastFocusedBuildingIdRef.current = effectiveSelectedBuilding.id;
    }
  }, [
    buildings,
    effectiveSelectedBuilding,
    effectiveSelectedBuildingId,
    incident,
    sceneBounds,
    sceneBuildings,
    sceneIncident,
    sceneKey,
    sceneReady,
    labelBuildings,
  ]);

  useEffect(() => () => {
    clearLabelMarkers();
  }, []);

  async function handleToggleFullscreen() {
    const root = rootRef.current;
    if (!root) return;

    try {
      if (document.fullscreenElement === root) {
        await document.exitFullscreen();
      } else {
        await root.requestFullscreen();
      }
    } catch (caughtError) {
      setSceneError(
        caughtError instanceof Error
          ? caughtError.message
          : "Fullscreen mode is not available for this scene.",
      );
    }
  }

  if (!incident) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4 text-[11px] text-slate-400">
        Select an incident to load indicative urban context.
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`overflow-hidden border border-slate-800 bg-[radial-gradient(circle_at_top,rgba(30,41,59,0.98),rgba(2,6,23,1))] text-white shadow-[0_18px_40px_rgba(15,23,42,0.35)] ${
        isFullscreen ? "h-full rounded-none border-0 shadow-none" : "rounded-2xl"
      }`}
    >
      <div className={`border-b border-slate-800 ${isFullscreen ? "px-5 py-4" : "px-4 py-3"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-cyan-300" />
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                3D building scene
              </div>
              {isFallback && (
                <div className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200">
                  Fallback demo data
                </div>
              )}
            </div>
            <div className="mt-2 text-sm font-semibold text-white">
              {incidentBuilding ? getUrbanBuildingDisplayLabel(incidentBuilding) : incident.desc}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Full 3D navigation with a cleaner map-first view. Select a block to sync it back to the main map.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void onRefresh?.()}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
            >
              <RefreshCcw size={12} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void handleToggleFullscreen()}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 transition-colors hover:border-cyan-300 hover:bg-cyan-400/16"
            >
              {isFullscreen ? <Minimize2 size={12} /> : <Expand size={12} />}
              {isFullscreen ? "Exit full screen" : "Full screen"}
            </button>
          </div>
        </div>
      </div>

      <div className={isFullscreen ? "px-5 py-4" : "px-3 py-3"}>
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          <div
            ref={containerRef}
            className="w-full"
            style={{ height: isFullscreen ? "calc(100vh - 260px)" : "360px" }}
          />

          {(!sceneReady || loading || sceneError || error) && (
            <div className="absolute inset-x-3 bottom-3 rounded-xl border border-slate-700 bg-slate-950/92 px-3 py-2 text-[10px] text-slate-300">
              {!sceneReady ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle size={12} className="animate-spin text-cyan-300" />
                  Initializing interactive 3D map...
                </span>
              ) : loading ? (
                <span className="flex items-center gap-2">
                  <LoaderCircle size={12} className="animate-spin text-cyan-300" />
                  Loading building footprints and labels...
                </span>
              ) : (sceneError || error) ? (
                <span className="flex items-center gap-2">
                  <AlertTriangle size={12} className="text-amber-300" />
                  {sceneError ?? error ?? "3D scene loaded with partial context."}
                </span>
              ) : null}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-300">
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1">
            <Move3D size={11} className="text-cyan-300" />
            Drag to pan
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1">
            <Compass size={11} className="text-amber-300" />
            Right drag to rotate
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2.5 py-1">
            <ZoomIn size={11} className="text-emerald-300" />
            Scroll to zoom
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2.5">
            <div className="text-[9px] uppercase tracking-wide text-slate-500">Incident building</div>
            <div className="mt-1 text-[11px] font-semibold text-rose-100">
              {incidentBuilding ? getUrbanBuildingDisplayLabel(incidentBuilding) : "Building not mapped"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2.5">
            <div className="text-[9px] uppercase tracking-wide text-slate-500">Selected block</div>
            <div className="mt-1 text-[11px] font-semibold text-cyan-200">
              {effectiveSelectedBuilding ? getUrbanBuildingDisplayLabel(effectiveSelectedBuilding) : "None selected"}
            </div>
            <div className="mt-1 text-[10px] leading-relaxed text-slate-400">
              {effectiveSelectedBuilding
                ? getUrbanBuildingAddressLine(effectiveSelectedBuilding) ?? "Address not available"
                : "Click a building in the 3D scene."}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-slate-500">
              <Boxes size={11} className="text-slate-500" />
              Labels visible
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-100">
              {labelBuildings.length} of {buildings.length} blocks
            </div>
            <div className="mt-1 text-[10px] leading-relaxed text-slate-400">
              {isFullscreen
                ? "Fullscreen shows more surrounding block labels while keeping the map readable."
                : "Only the key labels are shown here to keep the drawer uncluttered."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
