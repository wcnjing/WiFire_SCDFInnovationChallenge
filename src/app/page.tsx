"use client";
import { useEffect, useMemo, useState } from "react";
import { FIRE_STATIONS, AI_INSIGHTS } from "@/data/mock";
import { useAppState } from "@/hooks/useAppState";
import TopBar from "@/components/ui/TopBar";
import type { SourceStatus } from "@/components/ui/TopBar";
import PanelToggle from "@/components/ui/PanelToggle";
import RightPanel from "@/components/panels/RightPanel";
import SingaporeMap from "@/components/map/SingaporeMap";
import { AIBanner, MapLegend, FloatingAlert } from "@/components/map/MapOverlays";
import { useLTAIncidents, useLTASpeedBands, useLTATravelTimes } from "@/hooks/useLTAData";
import { useOneMapRoute } from "@/hooks/useOneMapRoute";
import { useNEAWeather } from "@/hooks/useNEAWeather";
import { calculateAvgResponseTime, calculateOverallHealth } from "@/lib/coverage";
import { REGIONS } from "@/data/mock";
import { buildWeatherOperationalModel } from "@/lib/weather";
import type { OneMapRouteMode } from "@/types";

function formatUpdatedLabel(timestamp: number | null | undefined) {
  if (!timestamp) return undefined;
  return new Date(timestamp).toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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
}): SourceStatus {
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
  return { label: "LTA", mode: error ? "mock" : "live" };
}

function getNEAStatus(params: {
  loading: boolean;
  error: string | null;
  fetchedAt: number | null | undefined;
}): SourceStatus {
  if (params.fetchedAt) {
    return { label: "NEA", mode: params.error ? "stale" : "live", updatedLabel: formatUpdatedLabel(params.fetchedAt) };
  }
  if (params.loading) return { label: "NEA", mode: "loading" };
  return { label: "NEA", mode: params.error ? "error" : "live" };
}

export default function HomePage() {
  const { state, actions, derived } = useAppState();
  const [routeIncidentId, setRouteIncidentId] = useState<number | null>(null);
  const [routeMode, setRouteMode] = useState<OneMapRouteMode>("drive");
  const [showAIBanner, setShowAIBanner] = useState(true);
  const [showMapLegend, setShowMapLegend] = useState(true);
  const { data: ltaIncidents, loading: ltaIncidentsLoading, error: ltaIncidentsError, fetchedAt: ltaIncidentsFetchedAt } = useLTAIncidents();
  const { data: ltaSpeedBands, loading: ltaSpeedBandsLoading, error: ltaSpeedBandsError, fetchedAt: ltaSpeedBandsFetchedAt } = useLTASpeedBands();
  const { data: ltaTravelTimes, loading: ltaTravelTimesLoading, error: ltaTravelTimesError, fetchedAt: ltaTravelTimesFetchedAt } = useLTATravelTimes();
  const { data: neaWeather, loading: neaWeatherLoading, error: neaWeatherError } = useNEAWeather();
  const weatherModel = useMemo(() => buildWeatherOperationalModel({
    stations: FIRE_STATIONS,
    forecasts: neaWeather?.forecasts ?? [],
    rainStations: neaWeather?.stations ?? [],
    timeOffset: state.timeOffset,
    forecastLabel: neaWeather?.forecastLabel ?? null,
    rainfallTimestamp: neaWeather?.rainfallTimestamp ?? null,
    forecastTimestamp: neaWeather?.forecastTimestamp ?? null,
    twentyFourHourPeriods: neaWeather?.twentyFourHourPeriods ?? [],
    twentyFourHourGeneral: neaWeather?.twentyFourHourGeneral ?? null,
    twentyFourHourUpdatedAt: neaWeather?.twentyFourHourUpdatedAt ?? null,
  }), [neaWeather, state.timeOffset]);
  const overallHealth = useMemo(
    () => calculateOverallHealth(REGIONS, state.timeOffset, weatherModel.regionPenalties),
    [state.timeOffset, weatherModel.regionPenalties],
  );
  const avgResponseTime = useMemo(
    () => calculateAvgResponseTime(FIRE_STATIONS, state.timeOffset, weatherModel.stationPenalties),
    [state.timeOffset, weatherModel.stationPenalties],
  );
  const combinedInsights = useMemo(
    () => [...weatherModel.insights, ...AI_INSIGHTS],
    [weatherModel.insights],
  );
  const routeIncidents = useMemo(
    () => derived.filteredIncidents,
    [derived.filteredIncidents],
  );
  const selectedRouteIncident = useMemo(
    () => routeIncidents.find((incident) => incident.id === routeIncidentId) ?? routeIncidents[0] ?? null,
    [routeIncidents, routeIncidentId],
  );
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
      return;
    }

    if (!routeIncidents.some((incident) => incident.id === routeIncidentId)) {
      setRouteIncidentId(routeIncidents[0].id);
    }
  }, [routeIncidentId, routeIncidents]);

  const sourceStatuses: SourceStatus[] = [
    getLTAStatus({
      incidentsLoading: ltaIncidentsLoading,
      speedBandsLoading: ltaSpeedBandsLoading,
      travelTimesLoading: ltaTravelTimesLoading,
      incidentsError: ltaIncidentsError,
      speedBandsError: ltaSpeedBandsError,
      travelTimesError: ltaTravelTimesError,
      incidentsFetchedAt: ltaIncidentsFetchedAt,
      speedBandsFetchedAt: ltaSpeedBandsFetchedAt,
      travelTimesFetchedAt: ltaTravelTimesFetchedAt,
    }),
    getNEAStatus({
      loading: neaWeatherLoading,
      error: neaWeatherError,
      fetchedAt: neaWeather?.fetchedAt,
    }),
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar activeView={state.activeView} onViewChange={actions.setView} sourceStatuses={sourceStatuses} />
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 relative overflow-hidden bg-surface-50">
          <div className="w-full h-full">
            <SingaporeMap stations={FIRE_STATIONS} incidents={derived.filteredIncidents} selectedStation={state.selectedStation}
              onStationClick={actions.selectStation} timeOffset={state.timeOffset} activeView={state.activeView}
              showTraffic={state.showTraffic} showWeather={state.showWeather} showIncidents={state.showIncidents}
              ltaIncidents={ltaIncidents} ltaSpeedBands={ltaSpeedBands} neaStations={neaWeather?.stations} neaForecasts={neaWeather?.forecasts}
              stationWeatherPenalties={weatherModel.stationPenalties}
              oneMapRoutePath={oneMapRoute?.path ?? []}
              oneMapRouteTarget={selectedRouteIncident} />
          </div>
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none z-[1200]">
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
          <div className="absolute bottom-3 left-3 z-[1200] pointer-events-auto">
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
          <div className="absolute bottom-4 right-4 z-[1200]">
            <FloatingAlert visible={state.timeOffset >= 30}
              message="Suggested standby repositioning: Alexandra Fire Station to Bukit Merah sector to maintain coverage." />
          </div>
        </div>
        <PanelToggle side="right" isOpen={state.rightPanelOpen} onClick={actions.toggleRightPanel} />
        <RightPanel state={state} isOpen={state.rightPanelOpen} selectedStation={state.selectedStation}
          timeOffset={state.timeOffset} incidents={routeIncidents} insights={combinedInsights}
          selectedStationWeatherImpact={state.selectedStation ? weatherModel.stationImpacts[state.selectedStation.id] ?? null : null}
          overallHealth={overallHealth}
          avgResponseTime={avgResponseTime}
          onTimeChange={actions.setTimeOffset}
          onToggleTraffic={actions.toggleTraffic}
          onToggleWeather={actions.toggleWeather}
          onToggleIncidents={actions.toggleIncidents}
          onIncidentTypeChange={actions.setIncidentType}
          weatherSummary={weatherModel.summary}
          weatherRegionImpacts={weatherModel.regionImpacts}
          travelTimes={ltaTravelTimes}
          travelTimesLoading={ltaTravelTimesLoading}
          travelTimesError={ltaTravelTimesError}
          travelTimesFetchedAt={ltaTravelTimesFetchedAt}
          routeIncidentId={selectedRouteIncident?.id ?? routeIncidentId}
          onRouteIncidentChange={setRouteIncidentId}
          routeMode={routeMode}
          onRouteModeChange={setRouteMode}
          oneMapRoute={oneMapRoute}
          oneMapRouteLoading={oneMapRouteLoading}
          oneMapRouteError={oneMapRouteError}
          oneMapRouteFetchedAt={oneMapRouteFetchedAt} />
      </div>
    </div>
  );
}
