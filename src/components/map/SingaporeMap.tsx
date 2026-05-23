"use client";
import { useEffect, useRef } from "react";
import type { CircleMarkerOptions, LayerGroup, Map as LeafletMap, PathOptions } from "leaflet";
import type { FireStation, Incident, LatLng, TimeOffset, ViewMode } from "@/types";
import { VOLUNTEER_ZONES } from "@/data/mock";
import { getCoverageColors, getAdjustedResponseTime } from "@/lib/coverage";
import type { LTAIncident, LTASpeedBand } from "@/hooks/useLTAData";
import type { NEAForecast, NEAStation } from "@/hooks/useNEAWeather";
import { forecastSeverity } from "@/hooks/useNEAWeather";

interface Props {
  stations: FireStation[];
  incidents: Incident[];
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
}

interface LayerGroups {
  coverage: LayerGroup;
  volunteer: LayerGroup;
  incidents: LayerGroup;
  ltaIncidents: LayerGroup;
  traffic: LayerGroup;
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

export default function SingaporeMap({
  stations,
  incidents,
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
      map.createPane("coverage");
      map.createPane("weather");
      map.createPane("route");
      map.createPane("stations");

      const trafficPane = map.getPane("traffic");
      const coveragePane = map.getPane("coverage");
      const weatherPane = map.getPane("weather");
      const routePane = map.getPane("route");
      const stationsPane = map.getPane("stations");

      if (trafficPane) trafficPane.style.zIndex = "360";
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
        .on("click", () => onStationClick(station))
        .addTo(layers.stations);

      if (isSelected) {
        L.circleMarker(
          [station.lat, station.lng],
          createCircleMarkerOptions({
            radius: 18,
            color: "#2563eb",
            fillColor: "#2563eb",
            fillOpacity: 0.12,
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
        L.circleMarker(
          [incident.lat, incident.lng],
          createCircleMarkerOptions({
            radius: incident.severity === "high" ? 9 : incident.severity === "medium" ? 7 : 6,
            color: "#ffffff",
            fillColor: incidentColor(incident),
            pane: "stations",
          }),
        )
          .bindPopup(`${incident.desc}<br/>${incident.severity.toUpperCase()} | ${incident.status}`)
          .addTo(layers.incidents);
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
  ]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

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
  }, [oneMapRoutePath, selectedStation]);

  return <div ref={containerRef} className="onemap-map w-full h-full" aria-label="OneMap operational map" />;
}
