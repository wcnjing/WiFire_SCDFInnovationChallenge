"use client";
import { useEffect, useRef } from "react";
import type { CircleMarkerOptions, LayerGroup, Map as LeafletMap, PathOptions } from "leaflet";
import type { FireStation, Incident, LatLng, TimeOffset, ViewMode } from "@/types";
import { VOLUNTEER_ZONES } from "@/data/mock";
import { getCoverageColors, getAdjustedResponseTime } from "@/lib/coverage";
import type { RankedTrafficCameraSnapshot } from "@/lib/trafficCameras";
import type { LTAIncident, LTASpeedBand } from "@/hooks/useLTAData";
import type { NEAForecast, NEAStation } from "@/hooks/useNEAWeather";
import { forecastSeverity } from "@/hooks/useNEAWeather";

interface Props {
  stations: FireStation[];
  incidents: Incident[];
  focusedIncidentId?: number | null;
  focusIncidentRequestKey?: number;
  selectedStation: FireStation | null;
  onStationClick: (s: FireStation) => void;
  timeOffset: TimeOffset;
  activeView: ViewMode;
  showTraffic: boolean;
  showWeather: boolean;
  showIncidents: boolean;
  ltaIncidents?: LTAIncident[];
  ltaSpeedBands?: LTASpeedBand[];
  neaStations?: NEAStation[];
  neaForecasts?: NEAForecast[];
  stationWeatherPenalties?: Partial<Record<number, number>>;
  oneMapRoutePath?: LatLng[];
  oneMapRouteTarget?: Incident | null;
  trafficCameraSnapshots?: RankedTrafficCameraSnapshot[];
  onTrafficCameraClick?: (camera: RankedTrafficCameraSnapshot) => void;
}

interface LayerGroups {
  coverage: LayerGroup;
  volunteer: LayerGroup;
  incidents: LayerGroup;
  ltaIncidents: LayerGroup;
  traffic: LayerGroup;
  trafficCameras: LayerGroup;
  weather: LayerGroup;
  route: LayerGroup;
  stations: LayerGroup;
}

type LeafletModule = typeof import("leaflet");

const SG_CENTER: [number, number] = [1.3521, 103.8198];
const SG_BOUNDS: [[number, number], [number, number]] = [
  [1.144, 103.535],
  [1.494, 104.502],
];
const ONE_MAP_TILES = "https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png";
const ONE_MAP_ATTRIBUTION = '<img src="https://www.onemap.gov.sg/web-assets/images/logo/om_logo.png" style="height:20px;width:20px;"/>&nbsp;<a href="https://www.onemap.gov.sg/" target="_blank" rel="noopener noreferrer">OneMap</a>&nbsp;&copy;&nbsp;contributors&nbsp;&#124;&nbsp;<a href="https://www.sla.gov.sg/" target="_blank" rel="noopener noreferrer">Singapore Land Authority</a>';

function speedBandColor(band: number): string {
  if (band <= 2) return "#dc2626";
  if (band <= 4) return "#f97316";
  if (band <= 6) return "#eab308";
  return "#22c55e";
}

function isPrimaryRoadCategory(category: string | number): boolean {
  const numericCategory = typeof category === "number" ? category : Number(category);
  if (Number.isFinite(numericCategory)) return numericCategory <= 4;
  return category <= "C";
}

function coverageRadiusMeters(station: FireStation, timeOffset: TimeOffset, activeView: ViewMode) {
  const base = activeView === "coverage" ? 3200 : 2200;
  const factor = station.risk === "high" ? 30 : station.risk === "medium" ? 20 : 8;
  return Math.max(base - timeOffset * factor, 850);
}

function stationPopupContent(station: FireStation, timeOffset: TimeOffset, weatherPenalty: number) {
  const adjusted = getAdjustedResponseTime(station, timeOffset, weatherPenalty);
  return `
    <div class="space-y-1">
      <div style="font-weight:700;color:#0f172a;">${station.name}</div>
      <div style="font-size:12px;color:#475569;">${station.coverage} region</div>
      <div style="font-size:12px;color:#475569;">Adjusted response: ${adjusted.toFixed(1)} min</div>
      <div style="font-size:12px;color:#475569;">Units: ${station.units} | Readiness: ${station.readiness}%</div>
    </div>
  `;
}

function incidentColor(incident: Incident) {
  return incident.type === "fire" ? "#ef4444" : "#f59e0b";
}

function forecastFill(forecast: string) {
  const severity = forecastSeverity(forecast);
  if (severity === "storm") return { color: "#1e40af", radius: 1500 };
  if (severity === "heavy") return { color: "#2563eb", radius: 1100 };
  if (severity === "light") return { color: "#60a5fa", radius: 800 };
  if (severity === "cloudy") return { color: "#94a3b8", radius: 650 };
  return { color: "#fbbf24", radius: 500 };
}

function createCircleMarkerOptions(options: CircleMarkerOptions): CircleMarkerOptions {
  return {
    weight: 1.5,
    opacity: 1,
    fillOpacity: 0.9,
    ...options,
  };
}

function createPathOptions(options: PathOptions): PathOptions {
  return {
    weight: 3,
    opacity: 0.85,
    ...options,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function trafficCameraPopupContent(camera: RankedTrafficCameraSnapshot) {
  const toneLabel = camera.tone === "station" ? "station corridor" : "incident corridor";

  return `
    <div style="width:220px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">
        Traffic camera snapshot
      </div>
      <div style="margin-top:6px;font-size:15px;font-weight:700;color:#0f172a;">
        Camera ${escapeHtml(camera.cameraId)}
      </div>
      <div style="margin-top:2px;font-size:12px;color:#475569;">
        ${escapeHtml(camera.focusLabel)} · ${camera.distanceKm.toFixed(1)} km away
      </div>
      <img
        src="${escapeHtml(camera.imageLink)}"
        alt="Traffic camera snapshot ${escapeHtml(camera.cameraId)}"
        style="margin-top:10px;width:100%;height:132px;object-fit:cover;border-radius:14px;border:1px solid #e2e8f0;background:#f8fafc;"
      />
      <div style="margin-top:8px;font-size:11px;color:#64748b;">
        Snapshot from LTA DataMall for ${escapeHtml(toneLabel)} analysis
      </div>
      <div style="margin-top:4px;font-size:10px;color:#94a3b8;">
        ${camera.latitude.toFixed(5)}, ${camera.longitude.toFixed(5)}
      </div>
    </div>
  `;
}

function trafficCameraMarkerHtml(tone: RankedTrafficCameraSnapshot["tone"]) {
  const border = tone === "station" ? "#2563eb" : "#f59e0b";
  const shadow = tone === "station" ? "rgba(37, 99, 235, 0.24)" : "rgba(245, 158, 11, 0.24)";

  return `
    <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:#ffffff;border:2px solid ${border};box-shadow:0 10px 18px ${shadow};">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H9l1.1-1.6A2 2 0 0 1 11.76 3.5h.48a2 2 0 0 1 1.66.9L15 6h2.5A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-8Z" stroke="#0f172a" stroke-width="1.6" stroke-linejoin="round"/>
        <circle cx="12" cy="12.5" r="3.25" stroke="#0f172a" stroke-width="1.6"/>
      </svg>
    </div>
  `;
}

export default function SingaporeMap({
  stations,
  incidents,
  focusedIncidentId = null,
  focusIncidentRequestKey = 0,
  selectedStation,
  onStationClick,
  timeOffset,
  activeView,
  showTraffic,
  showWeather,
  showIncidents,
  ltaIncidents = [],
  ltaSpeedBands = [],
  neaStations = [],
  neaForecasts = [],
  stationWeatherPenalties = {},
  oneMapRoutePath = [],
  oneMapRouteTarget = null,
  trafficCameraSnapshots = [],
  onTrafficCameraClick,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const layerGroupsRef = useRef<LayerGroups | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    let disposed = false;

    async function initialiseMap() {
      if (!containerRef.current || mapRef.current) return;

      const L = await import("leaflet");
      if (disposed || !containerRef.current) return;

      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        center: SG_CENTER,
        zoom: 12,
        minZoom: 11,
        maxZoom: 19,
        zoomControl: false,
        preferCanvas: true,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      const bounds = L.latLngBounds(SG_BOUNDS);
      map.setMaxBounds(bounds);
      map.fitBounds(bounds, { padding: [24, 24] });

      L.tileLayer(ONE_MAP_TILES, {
        detectRetina: true,
        minZoom: 11,
        maxZoom: 19,
        attribution: ONE_MAP_ATTRIBUTION,
      }).addTo(map);

      map.createPane("traffic");
      map.createPane("trafficCameras");
      map.createPane("coverage");
      map.createPane("weather");
      map.createPane("route");
      map.createPane("stations");

      const trafficPane = map.getPane("traffic");
      const trafficCamerasPane = map.getPane("trafficCameras");
      const coveragePane = map.getPane("coverage");
      const weatherPane = map.getPane("weather");
      const routePane = map.getPane("route");
      const stationsPane = map.getPane("stations");

      if (trafficPane) trafficPane.style.zIndex = "360";
      if (trafficCamerasPane) trafficCamerasPane.style.zIndex = "440";
      if (coveragePane) coveragePane.style.zIndex = "380";
      if (weatherPane) weatherPane.style.zIndex = "390";
      if (routePane) routePane.style.zIndex = "410";
      if (stationsPane) stationsPane.style.zIndex = "430";

      layerGroupsRef.current = {
        coverage: L.layerGroup().addTo(map),
        volunteer: L.layerGroup().addTo(map),
        incidents: L.layerGroup().addTo(map),
        ltaIncidents: L.layerGroup().addTo(map),
        traffic: L.layerGroup().addTo(map),
        trafficCameras: L.layerGroup().addTo(map),
        weather: L.layerGroup().addTo(map),
        route: L.layerGroup().addTo(map),
        stations: L.layerGroup().addTo(map),
      };

      if (typeof ResizeObserver !== "undefined") {
        resizeObserverRef.current = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserverRef.current.observe(containerRef.current);
      }

      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 0);
    }

    initialiseMap();

    return () => {
      disposed = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      layerGroupsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    const layers = layerGroupsRef.current;
    if (!map || !L || !layers) return;

    Object.values(layers).forEach((layer) => layer.clearLayers());

    if (showTraffic) {
      ltaSpeedBands
        .filter((band) => band.SpeedBand <= 5 && isPrimaryRoadCategory(band.RoadCategory))
        .forEach((band) => {
          const startLat = Number.parseFloat(band.StartLat);
          const startLng = Number.parseFloat(band.StartLon);
          const endLat = Number.parseFloat(band.EndLat);
          const endLng = Number.parseFloat(band.EndLon);
          if (![startLat, startLng, endLat, endLng].every(Number.isFinite)) return;

          L.polyline(
            [
              [startLat, startLng],
              [endLat, endLng],
            ],
            createPathOptions({
              color: speedBandColor(band.SpeedBand),
              weight: band.SpeedBand <= 2 ? 6 : 4,
              pane: "traffic",
            }),
          )
            .bindPopup(`${band.RoadName}: speed band ${band.SpeedBand}`)
            .addTo(layers.traffic);
        });

      trafficCameraSnapshots.forEach((camera) => {
        const marker = L.marker([camera.latitude, camera.longitude], {
          pane: "trafficCameras",
          interactive: true,
          keyboard: true,
          riseOnHover: true,
          icon: L.divIcon({
            className: "traffic-camera-marker",
            html: trafficCameraMarkerHtml(camera.tone),
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [0, -18],
          }),
        });

        marker
          .bindPopup(trafficCameraPopupContent(camera), {
            maxWidth: 240,
            className: "traffic-camera-popup",
          })
          .on("click", () => {
            marker.openPopup();
            onTrafficCameraClick?.(camera);
          })
          .addTo(layers.trafficCameras);
      });
    }

    if (showWeather) {
      neaForecasts.forEach((forecast) => {
        const style = forecastFill(forecast.forecast);
        L.circle([forecast.lat, forecast.lng], {
          radius: style.radius,
          color: style.color,
          fillColor: style.color,
          fillOpacity: 0.16,
          weight: 1,
          pane: "weather",
        })
          .bindPopup(`${forecast.area}: ${forecast.forecast}`)
          .addTo(layers.weather);
      });

      neaStations
        .filter((station) => station.rainfall > 0)
        .forEach((station) => {
          const fill = station.rainfall >= 3 ? "#1d4ed8" : station.rainfall >= 1 ? "#2563eb" : "#60a5fa";
          L.circleMarker(
            [station.lat, station.lng],
            createCircleMarkerOptions({
              radius: Math.min(7 + station.rainfall * 2.5, 18),
              color: fill,
              fillColor: fill,
              fillOpacity: 0.28,
              pane: "weather",
            }),
          )
            .bindPopup(`${station.name}: ${station.rainfall.toFixed(1)} mm rainfall`)
            .addTo(layers.weather);
        });
    }

    stations.forEach((station) => {
      const weatherPenalty = stationWeatherPenalties[station.id] ?? 0;
      const coverageColors = getCoverageColors(station, timeOffset, weatherPenalty);
      const isSelected = selectedStation?.id === station.id;
      const radiusMeters = coverageRadiusMeters(station, timeOffset, activeView);

      L.circle([station.lat, station.lng], {
        radius: radiusMeters,
        color: coverageColors.stroke,
        fillColor: coverageColors.fill,
        fillOpacity: isSelected ? 0.3 : 0.12,
        weight: isSelected ? 2.6 : 1.2,
        dashArray: "6 4",
        pane: "coverage",
      }).addTo(layers.coverage);

      if (activeView === "coverage") {
        L.circle([station.lat, station.lng], {
          radius: Math.max(radiusMeters * 0.55, 500),
          color: coverageColors.stroke,
          fillColor: coverageColors.fill,
          fillOpacity: isSelected ? 0.18 : 0.1,
          weight: 0,
          pane: "coverage",
        }).addTo(layers.coverage);
      }

      const marker = L.circleMarker(
        [station.lat, station.lng],
        createCircleMarkerOptions({
          radius: isSelected ? 11 : 7,
          color: "#ffffff",
          fillColor: isSelected ? "#1e3a8a" : "#1d4ed8",
          weight: isSelected ? 3 : 2,
          pane: "stations",
        }),
      )
        .bindPopup(stationPopupContent(station, timeOffset, weatherPenalty))
        .bindTooltip(String(station.id), {
          permanent: true,
          direction: "center",
          className: "station-id-tooltip",
          opacity: 1,
        })
        .on("click", () => {
          onStationClick(station);
          window.setTimeout(() => {
            marker.openPopup();
          }, 0);
        })
        .addTo(layers.stations);

      if (isSelected) {
        L.circleMarker(
          [station.lat, station.lng],
          createCircleMarkerOptions({
            radius: 18,
            color: "#2563eb",
            fillColor: "#2563eb",
            fillOpacity: 0.12,
            interactive: false,
            weight: 2.5,
            pane: "stations",
            dashArray: "4 2",
          }),
        ).addTo(layers.stations);

        L.circleMarker(
          [station.lat, station.lng],
          createCircleMarkerOptions({
            radius: 23,
            color: "#93c5fd",
            fillOpacity: 0,
            interactive: false,
            weight: 1.5,
            pane: "stations",
            dashArray: "2 6",
          }),
        ).addTo(layers.stations);

        marker.openPopup();
      }
    });

    if (activeView === "response") {
      VOLUNTEER_ZONES.forEach((zone) => {
        L.circleMarker(
          [zone.lat, zone.lng],
          createCircleMarkerOptions({
            radius: Math.max(zone.density / 7, 5),
            color: "#8b5cf6",
            fillColor: "#8b5cf6",
            fillOpacity: zone.responseProbability * 0.45,
          }),
        )
          .bindPopup(`Volunteer density ${zone.density} | AEDs ${zone.aedCount}`)
          .addTo(layers.volunteer);
      });
    }

    if (showIncidents) {
      incidents.forEach((incident) => {
        const isFocusedIncident = focusedIncidentId === incident.id;
        const marker = L.circleMarker(
          [incident.lat, incident.lng],
          createCircleMarkerOptions({
            radius: isFocusedIncident
              ? 10
              : incident.severity === "high"
                ? 9
                : incident.severity === "medium"
                  ? 7
                  : 6,
            color: "#ffffff",
            fillColor: incidentColor(incident),
            weight: isFocusedIncident ? 2.5 : 1.5,
            pane: "stations",
          }),
        )
          .bindPopup(`${incident.desc}<br/>${incident.severity.toUpperCase()} | ${incident.status}`)
          .addTo(layers.incidents);

        if (isFocusedIncident) {
          L.circleMarker(
            [incident.lat, incident.lng],
            createCircleMarkerOptions({
              radius: 16,
              color: "#f97316",
              fillColor: "#f97316",
              fillOpacity: 0.12,
              interactive: false,
              weight: 2,
              pane: "stations",
            }),
          ).addTo(layers.incidents);

          marker.openPopup();
        }
      });

      ltaIncidents.forEach((incident) => {
        L.circleMarker(
          [incident.Latitude, incident.Longitude],
          createCircleMarkerOptions({
            radius: 5,
            color: "#ffffff",
            fillColor: "#7c3aed",
            pane: "stations",
          }),
        )
          .bindPopup(`${incident.Type}: ${incident.Message}`)
          .addTo(layers.ltaIncidents);
      });
    }

    if (oneMapRoutePath.length > 1) {
      const routeCoordinates = oneMapRoutePath.map((point) => [point.lat, point.lng] as [number, number]);

      L.polyline(routeCoordinates, {
        color: "#1d4ed8",
        weight: 12,
        opacity: 0.22,
        pane: "route",
      }).addTo(layers.route);

      L.polyline(routeCoordinates, {
        color: "#ffffff",
        weight: 9,
        opacity: 0.95,
        pane: "route",
      }).addTo(layers.route);

      L.polyline(routeCoordinates, {
        color: "#0f766e",
        weight: 5.5,
        opacity: 0.95,
        pane: "route",
      }).addTo(layers.route);

      if (selectedStation) {
        L.circleMarker(
          [selectedStation.lat, selectedStation.lng],
          createCircleMarkerOptions({
            radius: 9,
            color: "#ffffff",
            fillColor: "#1e3a8a",
            weight: 3,
            pane: "route",
          }),
        )
          .bindPopup(`Route origin: ${selectedStation.name}`)
          .addTo(layers.route);
      }

      if (oneMapRouteTarget) {
        L.circleMarker(
          [oneMapRouteTarget.lat, oneMapRouteTarget.lng],
          createCircleMarkerOptions({
            radius: 9,
            color: "#ffffff",
            fillColor: "#0f766e",
            weight: 3,
            pane: "route",
          }),
        )
          .bindPopup(`Route target: ${oneMapRouteTarget.desc}`)
          .addTo(layers.route);
      }
    }
  }, [
    activeView,
    incidents,
    ltaIncidents,
    ltaSpeedBands,
    neaForecasts,
    neaStations,
    onStationClick,
    oneMapRoutePath,
    oneMapRouteTarget,
    selectedStation,
    showIncidents,
    showTraffic,
    showWeather,
    stationWeatherPenalties,
    stations,
    timeOffset,
    trafficCameraSnapshots,
    onTrafficCameraClick,
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    const focusedIncident = focusedIncidentId
      ? incidents.find((incident) => incident.id === focusedIncidentId) ?? null
      : null;

    if (focusedIncident && focusIncidentRequestKey > 0) {
      map.flyTo([focusedIncident.lat, focusedIncident.lng], Math.max(map.getZoom(), 15), { duration: 0.7 });
      return;
    }

    if (oneMapRoutePath.length > 1) {
      map.fitBounds(L.latLngBounds(oneMapRoutePath.map((point) => [point.lat, point.lng] as [number, number])), {
        padding: [42, 42],
        maxZoom: 15,
      });
      return;
    }

    if (selectedStation) {
      map.flyTo([selectedStation.lat, selectedStation.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
    }
  }, [focusIncidentRequestKey, focusedIncidentId, incidents, oneMapRoutePath, selectedStation]);

  return <div ref={containerRef} className="onemap-map w-full h-full" aria-label="OneMap operational map" />;
}
