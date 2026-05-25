"use client";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CloudRain, MapPinned, X } from "lucide-react";
import type {
  AppState,
  FireStation,
  Incident,
  AIInsight,
  TimeOffset,
  WeatherStationImpact,
  OneMapRouteData,
  OneMapRouteMode,
  WeatherRegionImpact,
  WeatherSummary,
  RecommendedAction,
  SourceStatus,
  TrafficCameraSnapshot,
  UrbanBuildingContext,
  UrbanBuildingSelectionOptions,
} from "@/types";
import { REGIONS } from "@/data/mock";
import MapLayers from "@/components/panels/MapLayers";
import RegionStatus from "@/components/panels/RegionStatus";
import RoutePlannerCard from "@/components/panels/RoutePlannerCard";
import AIInsightsList from "@/components/panels/AIInsightsList";
import TrafficCameraPanel from "@/components/panels/TrafficCameraPanel";
import UrbanIncidentContextCard from "@/components/panels/UrbanIncidentContextCard";
import ResponseCorridor3D from "@/components/map/ResponseCorridor3D";
import ModelCoveragePanel from "@/components/panels/ModelCoveragePanel";
import SupportingIntelligenceTabs, { type SupportingIntelligenceTab } from "@/components/panels/SupportingIntelligenceTabs";

interface Props {
  state: AppState;
  isOpen: boolean;
  activeTab: SupportingIntelligenceTab;
  selectedStation: FireStation | null;
  selectedStationWeatherImpact?: WeatherStationImpact | null;
  timeOffset: TimeOffset;
  incidents: Incident[];
  insights: AIInsight[];
  recommendedAction: RecommendedAction | null;
  neaStatus: SourceStatus;
  onFocusStation: (station: FireStation) => void;
  onTabChange: (tab: SupportingIntelligenceTab) => void;
  onClose: () => void;
  onToggleTraffic: () => void;
  onToggleWeather: () => void;
  onToggleIncidents: () => void;
  weatherSummary: WeatherSummary;
  weatherRegionImpacts: WeatherRegionImpact[];
  routeIncidentId: number | null;
  onRouteIncidentChange: (incidentId: number) => void;
  routeMode: OneMapRouteMode;
  onRouteModeChange: (mode: OneMapRouteMode) => void;
  oneMapRoute: OneMapRouteData | null;
  oneMapRouteLoading: boolean;
  oneMapRouteError: string | null;
  oneMapRouteFetchedAt: number | null;
  trafficCameras: TrafficCameraSnapshot[];
  trafficCameraLoading: boolean;
  trafficCameraError: string | null;
  trafficCameraLastUpdated: string | null;
  onRefreshTrafficCameras: () => void | Promise<void>;
  urbanContextBuildings: UrbanBuildingContext[];
  urbanContextLoading: boolean;
  urbanContextError: string | null;
  urbanContextIsFallback: boolean;
  urbanContextSource: string;
  selectedUrbanBuildingId: string | null;
  onSelectUrbanBuilding: (buildingId: string, options?: UrbanBuildingSelectionOptions) => void;
  onRefreshUrbanContext: () => void | Promise<void>;
  onOpenUrbanContext: () => void;
}

function SectionShell({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-surface-200 bg-white/95 p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

function formatDistance(totalDistanceMeters: number) {
  return totalDistanceMeters >= 1000
    ? `${(totalDistanceMeters / 1000).toFixed(2)} km`
    : `${Math.round(totalDistanceMeters)} m`;
}

function buildRouteConstraint(route: OneMapRouteData | null, error: string | null) {
  if (error) {
    return {
      title: "Live route currently unavailable",
      detail: "Use the recommendation as a guide while keeping the map and traffic evidence in view.",
      tone: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (!route) {
    return {
      title: "Waiting for a live route",
      detail: "Select a station and incident pairing to inspect route evidence and corridor delay.",
      tone: "border-surface-200 bg-surface-50 text-slate-600",
    };
  }

  const minutes = Math.max(route.summary.totalTimeSeconds / 60, 0.1);
  if (minutes > 11) {
    return {
      title: "Primary route is outside the target response window",
      detail: `${formatDistance(route.summary.totalDistanceMeters)} on ${route.mode} mode is currently tracking at ${minutes.toFixed(1)} min.`,
      tone: "border-red-200 bg-red-50 text-red-700",
    };
  }
  if (minutes > 8) {
    return {
      title: "Primary route is serviceable but under pressure",
      detail: `${formatDistance(route.summary.totalDistanceMeters)} on ${route.mode} mode is currently tracking at ${minutes.toFixed(1)} min.`,
      tone: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }
  return {
    title: "No major route delay flagged on the lead path",
    detail: `${formatDistance(route.summary.totalDistanceMeters)} on ${route.mode} mode is currently tracking at ${minutes.toFixed(1)} min.`,
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function weatherSourceLabel(status: SourceStatus) {
  if (status.mode === "mock") return "Fallback demo feed";
  if (status.mode === "loading") return "Loading live NEA weather";
  if (status.mode === "stale") return "Last live NEA snapshot";
  if (status.mode === "error") return "Weather feed unavailable";
  return "Live NEA weather";
}

function WeatherImpactSummary({
  summary,
  impacts,
  sourceStatus,
}: {
  summary: WeatherSummary;
  impacts: WeatherRegionImpact[];
  sourceStatus: SourceStatus;
}) {
  const topImpact = impacts[0] ?? null;
  const significantWeather = Boolean(
    topImpact
    && (topImpact.penalty >= 0.6 || topImpact.severity === "heavy" || topImpact.severity === "storm"),
  );
  const tone = significantWeather
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : "border-surface-200 bg-surface-50 text-slate-700";

  return (
    <div className={`rounded-xl border px-3 py-3 ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
          <CloudRain size={11} />
          {weatherSourceLabel(sourceStatus)}
        </div>
        {summary.updatedLabel && (
          <div className="ml-auto text-[10px] font-mono opacity-70">{summary.updatedLabel}</div>
        )}
      </div>
      <div className="mt-2 text-xs font-semibold">
        {topImpact
          ? significantWeather
            ? `${topImpact.region} weather may add +${topImpact.penalty.toFixed(1)} min`
            : `${topImpact.region} remains operationally manageable`
          : "No significant weather drag detected"}
      </div>
      <div className="mt-1 text-[11px] leading-relaxed opacity-80">
        {topImpact
          ? `${topImpact.forecast} across ${topImpact.periodLabel}. ${summary.twoHourWindow ?? "2-hour forecast window unavailable."}`
          : summary.twentyFourGeneralForecast ?? "Weather outlook unavailable."}
      </div>
    </div>
  );
}

function FocusedStationSummary({
  station,
  weatherImpact,
  onFocusStation,
}: {
  station: FireStation | null;
  weatherImpact: WeatherStationImpact | null | undefined;
  onFocusStation: (station: FireStation) => void;
}) {
  if (!station) {
    return (
      <div className="rounded-xl border border-dashed border-surface-200 bg-surface-50 px-3 py-4 text-[11px] text-slate-500">
        Focus a station from the map or active recommendation to inspect local area context.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-surface-100 bg-surface-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{station.name}</div>
          <div className="mt-1 text-[11px] leading-relaxed text-slate-500">
            {station.coverage} region • {station.readiness}% ready • {station.units} units • {station.risk} traffic exposure
          </div>
        </div>
        <button
          type="button"
          onClick={() => onFocusStation(station)}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-100"
        >
          <MapPinned size={12} />
          Focus on map
        </button>
      </div>

      {weatherImpact && (
        <div className="mt-3 rounded-xl border border-white/80 bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-600">
          Weather drag: +{weatherImpact.penalty.toFixed(1)} min near {weatherImpact.rainfallStation}. {weatherImpact.forecastArea} is currently {weatherImpact.forecast.toLowerCase()}.
        </div>
      )}
    </div>
  );
}

export default function SupportingIntelligenceDrawer({
  state,
  isOpen,
  activeTab,
  selectedStation,
  selectedStationWeatherImpact,
  timeOffset,
  incidents,
  insights,
  recommendedAction,
  neaStatus,
  onFocusStation,
  onTabChange,
  onClose,
  onToggleTraffic,
  onToggleWeather,
  onToggleIncidents,
  weatherSummary,
  weatherRegionImpacts,
  routeIncidentId,
  onRouteIncidentChange,
  routeMode,
  onRouteModeChange,
  oneMapRoute,
  oneMapRouteLoading,
  oneMapRouteError,
  oneMapRouteFetchedAt,
  trafficCameras,
  trafficCameraLoading,
  trafficCameraError,
  trafficCameraLastUpdated,
  onRefreshTrafficCameras,
  urbanContextBuildings,
  urbanContextLoading,
  urbanContextError,
  urbanContextIsFallback,
  urbanContextSource,
  selectedUrbanBuildingId,
  onSelectUrbanBuilding,
  onRefreshUrbanContext,
  onOpenUrbanContext,
}: Props) {
  const selectedIncident = incidents.find((incident) => incident.id === routeIncidentId) ?? incidents[0] ?? null;
  const focusStation = selectedStation ?? recommendedAction?.station ?? null;
  const routeConstraint = buildRouteConstraint(oneMapRoute, oneMapRouteError);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 z-[24] bg-slate-950/10 lg:hidden"
            aria-label="Close supporting intelligence drawer"
          />

          <motion.aside
            initial={{ x: 28, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 28, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="absolute inset-y-0 right-0 z-[30] flex min-h-0 w-[360px] max-w-[92vw] shrink-0 flex-col border-l border-surface-200 bg-surface-50/95 shadow-[0_22px_60px_rgba(15,23,42,0.18)] backdrop-blur lg:relative lg:z-20"
          >
            <div className="border-b border-surface-200 bg-white/80 p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Supporting Intelligence
                  </div>
                  <div className="mt-2">
                    <SupportingIntelligenceTabs activeTab={activeTab} onChange={onTabChange} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-surface-200 bg-white p-2 text-slate-400 transition-colors hover:bg-surface-50 hover:text-slate-600"
                  aria-label="Close supporting intelligence"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
              {activeTab === "evidence" && (
                <div className="space-y-3">
                  <SectionShell title="Route Summary">
                    <RoutePlannerCard
                      station={focusStation}
                      incidents={incidents}
                      selectedIncidentId={routeIncidentId}
                      onIncidentChange={onRouteIncidentChange}
                      routeMode={routeMode}
                      onRouteModeChange={onRouteModeChange}
                      route={oneMapRoute}
                      loading={oneMapRouteLoading}
                      error={oneMapRouteError}
                      fetchedAt={oneMapRouteFetchedAt}
                      showHeader={false}
                    />
                  </SectionShell>

                  <SectionShell title="Key Traffic Constraint">
                    <div className={`rounded-xl border px-3 py-3 ${routeConstraint.tone}`}>
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide">
                        <AlertTriangle size={11} />
                        Primary corridor watch
                      </div>
                      <div className="mt-2 text-xs font-semibold">{routeConstraint.title}</div>
                      <div className="mt-1 text-[11px] leading-relaxed text-current/80">{routeConstraint.detail}</div>
                    </div>
                  </SectionShell>

                  <SectionShell title="Camera Evidence Preview">
                    <TrafficCameraPanel
                      selectedStation={focusStation}
                      incidents={incidents}
                      selectedIncidentId={routeIncidentId}
                      cameras={trafficCameras}
                      loading={trafficCameraLoading}
                      error={trafficCameraError}
                      lastUpdated={trafficCameraLastUpdated}
                      onRefresh={onRefreshTrafficCameras}
                      showHeader={false}
                      maxInitialItems={2}
                    />
                  </SectionShell>

                  <details className="rounded-2xl border border-surface-200 bg-white shadow-sm">
                    <summary className="cursor-pointer list-none px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Optional Expanded Corridor Details
                    </summary>
                    <div className="px-3 pb-3">
                      <ResponseCorridor3D
                        selectedStation={focusStation}
                        incidents={incidents}
                        selectedIncidentId={routeIncidentId}
                        cameras={trafficCameras}
                        loading={trafficCameraLoading}
                        error={trafficCameraError}
                        lastUpdated={trafficCameraLastUpdated}
                        onRefresh={onRefreshTrafficCameras}
                      />
                    </div>
                  </details>
                </div>
              )}

              {activeTab === "context" && (
                <div className="space-y-3">
                  <UrbanIncidentContextCard
                    incident={selectedIncident}
                    buildings={urbanContextBuildings}
                    loading={urbanContextLoading}
                    error={urbanContextError}
                    isFallback={urbanContextIsFallback}
                    source={urbanContextSource}
                    selectedBuildingId={selectedUrbanBuildingId}
                    onSelectBuilding={onSelectUrbanBuilding}
                    onRefresh={onRefreshUrbanContext}
                    previewMode
                    onExpand={onOpenUrbanContext}
                  />

                  <SectionShell title="Weather Impact Summary">
                    <WeatherImpactSummary
                      summary={weatherSummary}
                      impacts={weatherRegionImpacts}
                      sourceStatus={neaStatus}
                    />
                  </SectionShell>

                  <SectionShell title="Focused Station Or Area">
                    <FocusedStationSummary
                      station={focusStation}
                      weatherImpact={selectedStationWeatherImpact}
                      onFocusStation={onFocusStation}
                    />
                  </SectionShell>

                  <SectionShell title="Regional Snapshot">
                    <RegionStatus
                      regions={REGIONS}
                      timeOffset={timeOffset}
                      weatherImpacts={weatherRegionImpacts}
                      showHeader={false}
                      maxItems={3}
                    />
                  </SectionShell>

                  <ModelCoveragePanel />
                </div>
              )}

              {activeTab === "forecast-controls" && (
                <div className="space-y-3">
                  <SectionShell title="Operational Insights">
                    <AIInsightsList insights={insights} showHeader={false} />
                  </SectionShell>

                  <SectionShell title="Map Layers">
                    <MapLayers
                      showTraffic={state.showTraffic}
                      showWeather={state.showWeather}
                      showIncidents={state.showIncidents}
                      onToggleTraffic={onToggleTraffic}
                      onToggleWeather={onToggleWeather}
                      onToggleIncidents={onToggleIncidents}
                      showHeader={false}
                    />
                  </SectionShell>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
