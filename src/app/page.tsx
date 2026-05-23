"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AI_INSIGHTS, FIRE_STATIONS, REGIONS } from "@/data/mock";
import { useAppState } from "@/hooks/useAppState";
import TopBar from "@/components/ui/TopBar";
import PanelToggle from "@/components/ui/PanelToggle";
import RightPanel from "@/components/panels/RightPanel";
import SingaporeMap from "@/components/map/SingaporeMap";
import { AIBanner, FloatingAlert, MapLegend, TrafficCameraPreview } from "@/components/map/MapOverlays";
import { useLTAIncidents, useLTASpeedBands, useLTATravelTimes } from "@/hooks/useLTAData";
import { useLTATrafficImages } from "@/hooks/useLTATrafficImages";
import { useOneMapRoute } from "@/hooks/useOneMapRoute";
import { useNEAWeather } from "@/hooks/useNEAWeather";
import { calculateAvgResponseTime, calculateOverallHealth, getAdjustedResponseTime } from "@/lib/coverage";
import { buildTrafficCameraFocusPoints, rankTrafficCameraSnapshots } from "@/lib/trafficCameras";
import { buildWeatherOperationalModel } from "@/lib/weather";
import { buildSimulatedLTAIncidents, buildSimulatedLTASpeedBands, buildSimulatedNEAWeather } from "@/lib/fallbackData";
import { SCENARIO_CONFIGS } from "@/lib/scenarios";
import type { RankedTrafficCameraSnapshot } from "@/lib/trafficCameras";
import type { OneMapRouteMode, RecommendedAction, ScenarioPreset, SourceStatus } from "@/types";

function formatUpdatedLabel(timestamp: number | null | undefined) {
  if (!timestamp) return undefined;
  return new Date(timestamp).toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function estimateDistanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const averageLat = ((aLat + bLat) / 2) * (Math.PI / 180);
  const latKm = (aLat - bLat) * 111;
  const lngKm = (aLng - bLng) * 111 * Math.cos(averageLat);
  return Math.sqrt(latKm ** 2 + lngKm ** 2);
}

function getDatasetStatus(params: {
  label: string;
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
  usingMock?: boolean;
  fallbackFetchedAt?: number | null;
}): SourceStatus {
  if (params.usingMock) {
    return {
      label: params.label,
      mode: "mock",
      updatedLabel: formatUpdatedLabel(params.fallbackFetchedAt ?? null),
    };
  }
  if (params.fetchedAt) {
    return {
      label: params.label,
      mode: params.error ? "stale" : "live",
      updatedLabel: formatUpdatedLabel(params.fetchedAt),
    };
  }
  if (params.loading) return { label: params.label, mode: "loading" };
  return { label: params.label, mode: params.error ? "error" : "live" };
}

function getLTAStatus(params: {
  incidentsLoading: boolean;
  speedBandsLoading: boolean;
  travelTimesLoading: boolean;
  incidentsError: string | null;
  speedBandsError: string | null;
  travelTimesError: string | null;
  incidentsFetchedAt: number | null;
  speedBandsFetchedAt: number | null;
  travelTimesFetchedAt: number | null;
  fallbackFetchedAt: number | null;
  usingMock: boolean;
}): SourceStatus {
  if (params.usingMock) {
    return { label: "LTA", mode: "mock", updatedLabel: formatUpdatedLabel(params.fallbackFetchedAt) };
  }

  const loading = params.incidentsLoading || params.speedBandsLoading || params.travelTimesLoading;
  const error = params.incidentsError ?? params.speedBandsError ?? params.travelTimesError;
  const fetchedAt = Math.max(
    params.incidentsFetchedAt ?? 0,
    params.speedBandsFetchedAt ?? 0,
    params.travelTimesFetchedAt ?? 0,
  ) || null;

  if (fetchedAt) {
    return { label: "LTA", mode: error ? "stale" : "live", updatedLabel: formatUpdatedLabel(fetchedAt) };
  }
  if (loading) return { label: "LTA", mode: "loading" };
  return { label: "LTA", mode: error ? "error" : "live" };
}

export default function HomePage() {
  const { state, actions, derived } = useAppState();
  const [routeIncidentId, setRouteIncidentId] = useState<number | null>(null);
  const [focusedIncidentId, setFocusedIncidentId] = useState<number | null>(null);
  const [focusIncidentRequestKey, setFocusIncidentRequestKey] = useState(0);
  const [routeMode, setRouteMode] = useState<OneMapRouteMode>("drive");
  const [scenario, setScenario] = useState<ScenarioPreset>("normal");
  const [showAIBanner, setShowAIBanner] = useState(true);
  const [showMapLegend, setShowMapLegend] = useState(true);
  const [selectedTrafficCamera, setSelectedTrafficCamera] = useState<RankedTrafficCameraSnapshot | null>(null);
  const { data: ltaIncidents, loading: ltaIncidentsLoading, error: ltaIncidentsError, fetchedAt: ltaIncidentsFetchedAt } = useLTAIncidents();
  const { data: ltaSpeedBands, loading: ltaSpeedBandsLoading, error: ltaSpeedBandsError, fetchedAt: ltaSpeedBandsFetchedAt } = useLTASpeedBands();
  const { data: ltaTravelTimes, loading: ltaTravelTimesLoading, error: ltaTravelTimesError, fetchedAt: ltaTravelTimesFetchedAt } = useLTATravelTimes();
  const {
    cameras: trafficCameras,
    loading: trafficCameraLoading,
    error: trafficCameraError,
    lastUpdated: trafficCameraLastUpdated,
    refetch: refetchTrafficCameras,
  } = useLTATrafficImages();
  const { data: neaWeather, loading: neaWeatherLoading, error: neaWeatherError } = useNEAWeather();

  const simulatedNEAWeather = useMemo(() => buildSimulatedNEAWeather(), []);
  const simulatedLTAIncidents = useMemo(() => buildSimulatedLTAIncidents(), []);
  const simulatedLTASpeedBands = useMemo(() => buildSimulatedLTASpeedBands(), []);
  const fallbackSnapshotAt = simulatedNEAWeather.fetchedAt;

  const usingFallbackNEA = !neaWeather && !neaWeatherLoading && Boolean(neaWeatherError);
  const usingFallbackLTAIncidents = ltaIncidents.length === 0 && Boolean(ltaIncidentsError);
  const usingFallbackLTASpeedBands = ltaSpeedBands.length === 0 && Boolean(ltaSpeedBandsError);
  const usingFallbackLTATravelTimes = ltaTravelTimes.length === 0 && Boolean(ltaTravelTimesError);
  const usingFallbackLTA = usingFallbackLTAIncidents || usingFallbackLTASpeedBands || usingFallbackLTATravelTimes;

  const activeLTAIncidents = useMemo(
    () => (usingFallbackLTAIncidents ? simulatedLTAIncidents : ltaIncidents),
    [ltaIncidents, simulatedLTAIncidents, usingFallbackLTAIncidents],
  );
  const activeLTASpeedBands = useMemo(
    () => (usingFallbackLTASpeedBands ? simulatedLTASpeedBands : ltaSpeedBands),
    [ltaSpeedBands, simulatedLTASpeedBands, usingFallbackLTASpeedBands],
  );
  const activeNEAWeather = useMemo(
    () => (usingFallbackNEA ? simulatedNEAWeather : neaWeather),
    [neaWeather, simulatedNEAWeather, usingFallbackNEA],
  );

  const weatherModel = useMemo(
    () =>
      buildWeatherOperationalModel({
        stations: FIRE_STATIONS,
        forecasts: activeNEAWeather?.forecasts ?? [],
        rainStations: activeNEAWeather?.stations ?? [],
        timeOffset: state.timeOffset,
        forecastLabel: activeNEAWeather?.forecastLabel ?? null,
        rainfallTimestamp: activeNEAWeather?.rainfallTimestamp ?? null,
        forecastTimestamp: activeNEAWeather?.forecastTimestamp ?? null,
        twentyFourHourPeriods: activeNEAWeather?.twentyFourHourPeriods ?? [],
        twentyFourHourGeneral: activeNEAWeather?.twentyFourHourGeneral ?? null,
        twentyFourHourUpdatedAt: activeNEAWeather?.twentyFourHourUpdatedAt ?? null,
      }),
    [activeNEAWeather, state.timeOffset],
  );

  const overallHealth = useMemo(
    () => calculateOverallHealth(REGIONS, state.timeOffset, weatherModel.regionPenalties),
    [state.timeOffset, weatherModel.regionPenalties],
  );
  const avgResponseTime = useMemo(
    () => calculateAvgResponseTime(FIRE_STATIONS, state.timeOffset, weatherModel.stationPenalties),
    [state.timeOffset, weatherModel.stationPenalties],
  );

  const routeIncidents = useMemo(() => derived.filteredIncidents, [derived.filteredIncidents]);
  const selectedRouteIncident = useMemo(
    () => routeIncidents.find((incident) => incident.id === routeIncidentId) ?? routeIncidents[0] ?? null,
    [routeIncidents, routeIncidentId],
  );
  const trafficCameraFocusPoints = useMemo(
    () => buildTrafficCameraFocusPoints(state.selectedStation, routeIncidents, selectedRouteIncident?.id ?? routeIncidentId),
    [routeIncidentId, routeIncidents, selectedRouteIncident?.id, state.selectedStation],
  );
  const mapTrafficCameras = useMemo(
    () => rankTrafficCameraSnapshots(trafficCameras, trafficCameraFocusPoints, 6),
    [trafficCameras, trafficCameraFocusPoints],
  );

  const scenarioConfig = SCENARIO_CONFIGS[scenario];

  const {
    data: oneMapRoute,
    loading: oneMapRouteLoading,
    error: oneMapRouteError,
    fetchedAt: oneMapRouteFetchedAt,
  } = useOneMapRoute({
    start: state.selectedStation ? { lat: state.selectedStation.lat, lng: state.selectedStation.lng } : null,
    end: selectedRouteIncident ? { lat: selectedRouteIncident.lat, lng: selectedRouteIncident.lng } : null,
    mode: routeMode,
  });

  useEffect(() => {
    if (!routeIncidents.length) {
      setRouteIncidentId(null);
      setFocusedIncidentId(null);
      return;
    }

    if (!routeIncidents.some((incident) => incident.id === routeIncidentId)) {
      setRouteIncidentId(routeIncidents[0].id);
    }
  }, [routeIncidentId, routeIncidents]);

  const focusIncidentOnMap = useCallback((incident: (typeof routeIncidents)[number]) => {
    setRouteIncidentId(incident.id);
    setFocusedIncidentId(incident.id);
    setFocusIncidentRequestKey((current) => current + 1);
  }, []);

  const applyScenario = useCallback((nextScenario: ScenarioPreset) => {
    const config = SCENARIO_CONFIGS[nextScenario];
    setScenario(nextScenario);
    actions.setTimeOffset(config.timeOffset);
    if (state.showTraffic !== config.showTraffic) actions.toggleTraffic();
    if (state.showWeather !== config.showWeather) actions.toggleWeather();
    if (state.showIncidents !== config.showIncidents) actions.toggleIncidents();
    actions.setIncidentType(config.incidentType);
  }, [actions, state.showIncidents, state.showTraffic, state.showWeather]);

  const neaStatus = getDatasetStatus({
    label: "NEA",
    loading: neaWeatherLoading,
    error: neaWeatherError,
    fetchedAt: activeNEAWeather?.fetchedAt ?? null,
    usingMock: usingFallbackNEA,
    fallbackFetchedAt: fallbackSnapshotAt,
  });
  const ltaStatus = getLTAStatus({
    incidentsLoading: ltaIncidentsLoading,
    speedBandsLoading: ltaSpeedBandsLoading,
    travelTimesLoading: ltaTravelTimesLoading,
    incidentsError: ltaIncidentsError,
    speedBandsError: ltaSpeedBandsError,
    travelTimesError: ltaTravelTimesError,
    incidentsFetchedAt: ltaIncidentsFetchedAt,
    speedBandsFetchedAt: ltaSpeedBandsFetchedAt,
    travelTimesFetchedAt: ltaTravelTimesFetchedAt,
    fallbackFetchedAt: fallbackSnapshotAt,
    usingMock: usingFallbackLTA,
  });

  const recommendedAction: RecommendedAction | null = useMemo(() => {
    if (FIRE_STATIONS.length === 0) return null;

    const targetIncident = selectedRouteIncident ?? routeIncidents[0] ?? null;
    const rankedStations = FIRE_STATIONS.map((station) => {
      const weatherPenalty = weatherModel.stationPenalties[station.id] ?? 0;
      const baseResponse = getAdjustedResponseTime(station, state.timeOffset, weatherPenalty);
      const distancePenalty = targetIncident
        ? Math.max(estimateDistanceKm(station.lat, station.lng, targetIncident.lat, targetIncident.lng) - 3.5, 0) * 0.22
        : 0;
      const readinessAdjustment = Math.max(Math.min((88 - station.readiness) * 0.03, 0.45), -0.24);
      const unitPenalty = station.units <= 2 ? 0.55 : station.units === 3 ? 0.2 : 0;
      const scenarioPenalty = scenarioConfig.extraDelay * (station.risk === "high" ? 0.9 : station.risk === "medium" ? 0.55 : 0.25);
      const incidentPenalty = targetIncident?.severity === "high" && station.units <= 2 ? 0.35 : 0;
      const total = baseResponse + distancePenalty + readinessAdjustment + unitPenalty + scenarioPenalty + incidentPenalty;

      return {
        station,
        total,
        weatherPenalty,
        distancePenalty,
      };
    }).sort((left, right) => left.total - right.total);

    const primary = rankedStations[0];
    const backup = rankedStations[1];
    if (!primary) return null;

    let predictedResponseTime = primary.total;
    if (state.selectedStation && oneMapRoute && state.selectedStation.id === primary.station.id) {
      predictedResponseTime = Math.max(oneMapRoute.summary.totalTimeSeconds / 60, 0.1);
    }

    const targetLabel = targetIncident?.desc ?? "current operational demand";
    const reasonParts = [
      `Best dispatch fit for ${targetLabel}`,
      primary.station.readiness >= 90 ? `readiness ${primary.station.readiness}%` : `${primary.station.units} units available`,
      primary.weatherPenalty < 0.5 ? "low weather drag" : `weather adds ${primary.weatherPenalty.toFixed(1)}m`,
    ];

    if (scenarioConfig.extraDelay > 0.5) {
      reasonParts.push(`${scenarioConfig.label.toLowerCase()} pressure absorbed better than peer stations`);
    }

    const coverageImpact = backup
      ? `${primary.station.coverage} remains primary while ${backup.station.name} holds overlap support.`
      : `${primary.station.name} retains the strongest remaining overlap cover.`;

    const confidence = Math.max(
      68,
      Math.min(
        97,
        Math.round(
          92
          - scenarioConfig.extraDelay * 4
          - primary.weatherPenalty * 7
          - primary.distancePenalty * 1.2
          + (primary.station.readiness - 85) * 0.4
          + scenarioConfig.confidenceModifier,
        ),
      ),
    );

    return {
      station: primary.station,
      predictedResponseTime: Number(predictedResponseTime.toFixed(1)),
      reason: reasonParts.join(", "),
      confidence,
      coverageImpact,
    };
  }, [
    oneMapRoute,
    routeIncidents,
    scenarioConfig,
    selectedRouteIncident,
    state.selectedStation,
    state.timeOffset,
    weatherModel.stationPenalties,
  ]);

  const commandInsight = useMemo(() => {
    if (!recommendedAction) return null;

    return {
      id: 9000,
      severity: recommendedAction.predictedResponseTime > 11 ? "critical" as const : recommendedAction.predictedResponseTime > 8 ? "warning" as const : "info" as const,
      region: recommendedAction.station.coverage,
      time: scenarioConfig.label,
      text: recommendedAction.reason,
      prediction: `Dispatch ${recommendedAction.station.name} as the lead recommendation.`,
      impact: recommendedAction.coverageImpact,
      action: `Commit ${recommendedAction.station.name} and keep the selected incident route in monitor view.`,
      confidence: recommendedAction.confidence,
    };
  }, [recommendedAction, scenarioConfig.label]);

  const combinedInsights = useMemo(
    () => (commandInsight ? [commandInsight, ...weatherModel.insights, ...AI_INSIGHTS] : [...weatherModel.insights, ...AI_INSIGHTS]),
    [commandInsight, weatherModel.insights],
  );

  const sourceStatuses: SourceStatus[] = [ltaStatus, neaStatus];

  useEffect(() => {
    if (mapTrafficCameras.length === 0) {
      setSelectedTrafficCamera(null);
      return;
    }

    setSelectedTrafficCamera((current) => {
      if (!current) return current;
      return mapTrafficCameras.find((camera) => camera.cameraId === current.cameraId) ?? null;
    });
  }, [mapTrafficCameras]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopBar activeView={state.activeView} onViewChange={actions.setView} sourceStatuses={sourceStatuses} />
      <div className="relative flex flex-1 overflow-hidden">
        <div className="relative flex-1 overflow-hidden bg-surface-50">
          <div className="h-full w-full">
            <SingaporeMap
              stations={FIRE_STATIONS}
              incidents={derived.filteredIncidents}
              focusedIncidentId={focusedIncidentId}
              focusIncidentRequestKey={focusIncidentRequestKey}
              selectedStation={state.selectedStation}
              onStationClick={actions.selectStation}
              timeOffset={state.timeOffset}
              activeView={state.activeView}
              showTraffic={state.showTraffic}
              showWeather={state.showWeather}
              showIncidents={state.showIncidents}
              ltaIncidents={activeLTAIncidents}
              ltaSpeedBands={activeLTASpeedBands}
              neaStations={activeNEAWeather?.stations}
              neaForecasts={activeNEAWeather?.forecasts}
              stationWeatherPenalties={weatherModel.stationPenalties}
              oneMapRoutePath={oneMapRoute?.path ?? []}
              oneMapRouteTarget={selectedRouteIncident}
              trafficCameraSnapshots={mapTrafficCameras}
              onTrafficCameraClick={setSelectedTrafficCamera}
            />
          </div>

          <div className="pointer-events-none absolute left-3 right-3 top-3 z-[1200] flex items-start justify-between">
            <div className="pointer-events-auto flex flex-col gap-2">
              {showAIBanner ? (
                <AIBanner timeOffset={state.timeOffset} onClose={() => setShowAIBanner(false)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAIBanner(true)}
                  className="rounded-full border border-surface-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-violet-600 shadow-sm transition-colors hover:bg-violet-50"
                >
                  Show AI Prediction
                </button>
              )}
            </div>
          </div>

          <div className="pointer-events-auto absolute bottom-3 left-3 z-[1200]">
            {showMapLegend ? (
              <MapLegend activeView={state.activeView} onClose={() => setShowMapLegend(false)} />
            ) : (
              <button
                type="button"
                onClick={() => setShowMapLegend(true)}
                className="rounded-full border border-surface-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
              >
                Show Coverage Zones
              </button>
            )}
          </div>

          {state.showTraffic && selectedTrafficCamera && (
            <div className="pointer-events-none absolute inset-x-0 top-20 z-[1210] flex justify-center px-4">
              <div className="pointer-events-auto">
                <TrafficCameraPreview
                  camera={selectedTrafficCamera}
                  onClose={() => setSelectedTrafficCamera(null)}
                />
              </div>
            </div>
          )}

          <div className="absolute bottom-4 right-4 z-[1200]">
            <FloatingAlert
              visible={state.timeOffset >= 30}
              message="Suggested standby repositioning: Alexandra Fire Station to Bukit Merah sector to maintain coverage."
            />
          </div>
        </div>

        <PanelToggle side="right" isOpen={state.rightPanelOpen} onClick={actions.toggleRightPanel} />

        <RightPanel
          state={state}
          isOpen={state.rightPanelOpen}
          selectedStation={state.selectedStation}
          timeOffset={state.timeOffset}
          incidents={routeIncidents}
          insights={combinedInsights}
          selectedStationWeatherImpact={state.selectedStation ? weatherModel.stationImpacts[state.selectedStation.id] ?? null : null}
          overallHealth={overallHealth}
          avgResponseTime={avgResponseTime}
          recommendedAction={recommendedAction}
          scenario={scenario}
          ltaStatus={ltaStatus}
          neaStatus={neaStatus}
          onFocusStation={actions.selectStation}
          onScenarioChange={applyScenario}
          onTimeChange={actions.setTimeOffset}
          onToggleTraffic={actions.toggleTraffic}
          onToggleWeather={actions.toggleWeather}
          onToggleIncidents={actions.toggleIncidents}
          onIncidentTypeChange={actions.setIncidentType}
          weatherSummary={weatherModel.summary}
          weatherRegionImpacts={weatherModel.regionImpacts}
          routeIncidentId={selectedRouteIncident?.id ?? routeIncidentId}
          onRouteIncidentChange={setRouteIncidentId}
          routeMode={routeMode}
          onRouteModeChange={setRouteMode}
          oneMapRoute={oneMapRoute}
          oneMapRouteLoading={oneMapRouteLoading}
          oneMapRouteError={oneMapRouteError}
          oneMapRouteFetchedAt={oneMapRouteFetchedAt}
          onFocusIncident={focusIncidentOnMap}
          trafficCameras={trafficCameras}
          trafficCameraLoading={trafficCameraLoading}
          trafficCameraError={trafficCameraError}
          trafficCameraLastUpdated={trafficCameraLastUpdated}
          onRefreshTrafficCameras={refetchTrafficCameras}
        />
      </div>
    </div>
  );
}
