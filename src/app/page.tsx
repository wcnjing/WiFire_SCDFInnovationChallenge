"use client";
import { useMemo } from "react";
import { FIRE_STATIONS, INCIDENTS, AI_INSIGHTS } from "@/data/mock";
import { useAppState } from "@/hooks/useAppState";
import TopBar from "@/components/ui/TopBar";
import type { SourceStatus } from "@/components/ui/TopBar";
import PanelToggle from "@/components/ui/PanelToggle";
import LeftPanel from "@/components/panels/LeftPanel";
import RightPanel from "@/components/panels/RightPanel";
import SingaporeMap from "@/components/map/SingaporeMap";
import { AIBanner, MapLegend, FloatingAlert } from "@/components/map/MapOverlays";
import { useLTAIncidents, useLTASpeedBands } from "@/hooks/useLTAData";
import { useNEAWeather } from "@/hooks/useNEAWeather";
import { calculateAvgResponseTime, calculateOverallHealth } from "@/lib/coverage";
import { REGIONS } from "@/data/mock";
import { buildWeatherOperationalModel } from "@/lib/weather";

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
  incidentsError: string | null;
  speedBandsError: string | null;
  incidentsFetchedAt: number | null;
  speedBandsFetchedAt: number | null;
}): SourceStatus {
  const loading = params.incidentsLoading || params.speedBandsLoading;
  const error = params.incidentsError ?? params.speedBandsError;
  const fetchedAt = Math.max(params.incidentsFetchedAt ?? 0, params.speedBandsFetchedAt ?? 0) || null;

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
  const { data: ltaIncidents, loading: ltaIncidentsLoading, error: ltaIncidentsError, fetchedAt: ltaIncidentsFetchedAt } = useLTAIncidents();
  const { data: ltaSpeedBands, loading: ltaSpeedBandsLoading, error: ltaSpeedBandsError, fetchedAt: ltaSpeedBandsFetchedAt } = useLTASpeedBands();
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

  const sourceStatuses: SourceStatus[] = [
    getLTAStatus({
      incidentsLoading: ltaIncidentsLoading,
      speedBandsLoading: ltaSpeedBandsLoading,
      incidentsError: ltaIncidentsError,
      speedBandsError: ltaSpeedBandsError,
      incidentsFetchedAt: ltaIncidentsFetchedAt,
      speedBandsFetchedAt: ltaSpeedBandsFetchedAt,
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
        <PanelToggle side="left" isOpen={state.leftPanelOpen} onClick={actions.toggleLeftPanel} />
        <LeftPanel state={state} overallHealth={overallHealth} avgResponseTime={avgResponseTime}
          onTimeChange={actions.setTimeOffset} onToggleTraffic={actions.toggleTraffic} onToggleWeather={actions.toggleWeather}
          onToggleIncidents={actions.toggleIncidents} onIncidentTypeChange={actions.setIncidentType}
          weatherSummary={weatherModel.summary} weatherRegionImpacts={weatherModel.regionImpacts} />
        <div className="flex-1 relative overflow-hidden bg-surface-50">
          <div className="w-full h-full">
            <SingaporeMap stations={FIRE_STATIONS} incidents={derived.filteredIncidents} selectedStation={state.selectedStation}
              onStationClick={actions.selectStation} timeOffset={state.timeOffset} activeView={state.activeView}
              showTraffic={state.showTraffic} showWeather={state.showWeather} showIncidents={state.showIncidents}
              ltaIncidents={ltaIncidents} ltaSpeedBands={ltaSpeedBands} neaStations={neaWeather?.stations} neaForecasts={neaWeather?.forecasts}
              stationWeatherPenalties={weatherModel.stationPenalties} />
          </div>
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none z-10">
            <div className="pointer-events-auto"><AIBanner timeOffset={state.timeOffset} /></div>
          </div>
          <div className="absolute bottom-3 left-3 z-10"><MapLegend activeView={state.activeView} /></div>
          <div className="absolute bottom-4 right-4 z-30">
            <FloatingAlert visible={state.timeOffset >= 30}
              message="Suggested standby repositioning: Alexandra Fire Station to Bukit Merah sector to maintain coverage." />
          </div>
        </div>
        <PanelToggle side="right" isOpen={state.rightPanelOpen} onClick={actions.toggleRightPanel} />
        <RightPanel isOpen={state.rightPanelOpen} selectedStation={state.selectedStation}
          timeOffset={state.timeOffset} incidents={INCIDENTS} insights={combinedInsights}
          selectedStationWeatherImpact={state.selectedStation ? weatherModel.stationImpacts[state.selectedStation.id] ?? null : null} />
      </div>
    </div>
  );
}
