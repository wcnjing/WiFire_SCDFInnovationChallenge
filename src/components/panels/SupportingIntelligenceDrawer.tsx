"use client";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Layers3, X } from "lucide-react";
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
  ScenarioPreset,
  SourceStatus,
  TrafficCameraSnapshot,
} from "@/types";
import { REGIONS } from "@/data/mock";
import { SCENARIO_CONFIGS } from "@/lib/scenarios";
import RecommendedActionCard from "@/components/panels/RecommendedActionCard";
import ScenarioControls from "@/components/panels/ScenarioControls";
import MapLayers from "@/components/panels/MapLayers";
import WeatherOutlook from "@/components/panels/WeatherOutlook";
import RegionStatus from "@/components/panels/RegionStatus";
import StationCard from "@/components/panels/StationCard";
import RoutePlannerCard from "@/components/panels/RoutePlannerCard";
import AIInsightsList from "@/components/panels/AIInsightsList";
import TrafficCameraPanel from "@/components/panels/TrafficCameraPanel";
import TravelTimesCard from "@/components/panels/TravelTimesCard";
import UrbanIncidentContextCard from "@/components/panels/UrbanIncidentContextCard";
import ResponseCorridor3D from "@/components/map/ResponseCorridor3D";
import { AIBanner } from "@/components/map/MapOverlays";
import type { LTATravelTime } from "@/hooks/useLTAData";
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
  overallHealth: number;
  avgResponseTime: number;
  recommendedAction: RecommendedAction | null;
  scenario: ScenarioPreset;
  ltaStatus: SourceStatus;
  neaStatus: SourceStatus;
  onFocusStation: (station: FireStation) => void;
  onScenarioChange: (scenario: ScenarioPreset) => void;
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
  ltaTravelTimes: LTATravelTime[];
  ltaTravelTimesLoading: boolean;
  ltaTravelTimesError: string | null;
  ltaTravelTimesFetchedAt: number | null;
  trafficCameras: TrafficCameraSnapshot[];
  trafficCameraLoading: boolean;
  trafficCameraError: string | null;
  trafficCameraLastUpdated: string | null;
  onRefreshTrafficCameras: () => void | Promise<void>;
}

function SectionShell({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-surface-200 bg-white/95 p-3 shadow-sm">
      {title && <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</div>}
      {children}
    </section>
  );
}

const sourceTone = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  loading: "border-amber-200 bg-amber-50 text-amber-700",
  mock: "border-violet-200 bg-violet-50 text-violet-700",
  error: "border-red-200 bg-red-50 text-red-700",
  stale: "border-slate-200 bg-slate-100 text-slate-700",
} as const;

function SourceBadge({ source }: { source: SourceStatus }) {
  const label = source.mode === "mock"
    ? "Fallback"
    : source.mode === "loading"
      ? "Loading"
      : source.mode === "stale"
        ? "Stale"
        : source.mode === "error"
          ? "Error"
          : "Live";

  return (
    <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${sourceTone[source.mode]}`}>
      {source.label} {label}
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
  overallHealth,
  avgResponseTime,
  recommendedAction,
  scenario,
  ltaStatus,
  neaStatus,
  onFocusStation,
  onScenarioChange,
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
  ltaTravelTimes,
  ltaTravelTimesLoading,
  ltaTravelTimesError,
  ltaTravelTimesFetchedAt,
  trafficCameras,
  trafficCameraLoading,
  trafficCameraError,
  trafficCameraLastUpdated,
  onRefreshTrafficCameras,
}: Props) {
  const scenarioConfig = SCENARIO_CONFIGS[scenario];
  const selectedIncident = incidents.find((incident) => incident.id === routeIncidentId) ?? incidents[0] ?? null;
  const focusStation = selectedStation ?? recommendedAction?.station ?? null;
  const criticalRegions = weatherRegionImpacts.slice(0, 3);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            aria-label="Close supporting intelligence"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-slate-950/18 xl:hidden"
          />

          <motion.aside
            initial={{ x: 28, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 28, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="absolute inset-y-0 right-0 z-40 flex w-[min(92vw,392px)] shrink-0 flex-col border-l border-surface-200 bg-surface-50/95 shadow-[0_22px_60px_rgba(15,23,42,0.18)] backdrop-blur xl:relative xl:inset-auto xl:z-20 xl:w-[392px] xl:shadow-none"
          >
            <div className="border-b border-surface-200 bg-white/90 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Layers3 size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Supporting Intelligence
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-900">Why the system is recommending this action</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    Route evidence, environment context, coverage pressure, prototype forecasting, and scenario controls.
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

              <div className="mt-3 flex flex-wrap gap-1.5">
                <SourceBadge source={ltaStatus} />
                <SourceBadge source={neaStatus} />
                <div className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                  Prototype forecast active
                </div>
              </div>
            </div>

            <div className="border-b border-surface-200 bg-white/75 p-3">
              <SupportingIntelligenceTabs activeTab={activeTab} onChange={onTabChange} />
            </div>

            <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
              {activeTab === "route" && (
                <div className="space-y-3">
                  {recommendedAction && (
                    <RecommendedActionCard
                      action={recommendedAction}
                      selectedStation={selectedStation}
                      scenarioLabel={scenarioConfig.label}
                      onFocusStation={onFocusStation}
                    />
                  )}

                  <SectionShell title="Operational Route">
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
                    />
                  </SectionShell>

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

                  <SectionShell>
                    <TravelTimesCard
                      travelTimes={ltaTravelTimes}
                      loading={ltaTravelTimesLoading}
                      error={ltaTravelTimesError}
                      fetchedAt={ltaTravelTimesFetchedAt}
                      sourceStatus={ltaStatus}
                    />
                  </SectionShell>

                  <TrafficCameraPanel
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
              )}

              {activeTab === "environment" && (
                <div className="space-y-3">
                  <SectionShell>
                    <WeatherOutlook
                      summary={weatherSummary}
                      regionImpacts={weatherRegionImpacts}
                      timeOffset={timeOffset}
                      sourceStatus={neaStatus}
                    />
                  </SectionShell>
                  <UrbanIncidentContextCard incident={selectedIncident} />
                </div>
              )}

              {activeTab === "coverage" && (
                <div className="space-y-3">
                  <SectionShell title="Current Command Posture">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5">
                        <div className="text-[10px] text-slate-400">Coverage health</div>
                        <div className={`text-lg font-bold font-mono ${
                          overallHealth >= 85 ? "text-coverage-green" : overallHealth >= 75 ? "text-coverage-amber" : "text-coverage-red"
                        }`}>
                          {overallHealth}%
                        </div>
                      </div>
                      <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5">
                        <div className="text-[10px] text-slate-400">Avg response</div>
                        <div className={`text-lg font-bold font-mono ${
                          avgResponseTime <= 8 ? "text-coverage-green" : avgResponseTime <= 11 ? "text-coverage-amber" : "text-coverage-red"
                        }`}>
                          {avgResponseTime.toFixed(1)}m
                        </div>
                      </div>
                    </div>
                  </SectionShell>

                  <SectionShell title="Coverage Gaps">
                    <div className="space-y-2">
                      {criticalRegions.map((impact) => (
                        <div key={impact.region} className="rounded-xl border border-surface-100 bg-white px-3 py-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold text-slate-900">{impact.region}</div>
                              <div className="mt-0.5 text-[11px] text-slate-500">{impact.forecast}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold font-mono text-slate-900">+{impact.penalty.toFixed(1)}m</div>
                              <div className="text-[10px] uppercase tracking-wide text-slate-400">{impact.severity}</div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {criticalRegions.length === 0 && (
                        <div className="rounded-xl border border-surface-100 bg-surface-50 px-3 py-3 text-[11px] text-slate-500">
                          No region-level coverage gaps are currently flagged by the prototype model.
                        </div>
                      )}
                    </div>
                  </SectionShell>

                  <SectionShell title="Focused Station">
                    <StationCard station={focusStation} timeOffset={timeOffset} weatherImpact={selectedStationWeatherImpact} />
                  </SectionShell>

                  <SectionShell title="Regional Status">
                    <RegionStatus regions={REGIONS} timeOffset={timeOffset} weatherImpacts={weatherRegionImpacts} />
                  </SectionShell>
                </div>
              )}

              {activeTab === "forecasting" && (
                <div className="space-y-3">
                  <SectionShell title="Prototype Forecast Banner">
                    <AIBanner timeOffset={timeOffset} />
                  </SectionShell>
                  <SectionShell title="Operational Insights">
                    <AIInsightsList insights={insights} />
                  </SectionShell>
                </div>
              )}

              {activeTab === "demo" && (
                <div className="space-y-3">
                  <SectionShell title="Scenario Controls">
                    <ScenarioControls value={scenario} onChange={onScenarioChange} />
                  </SectionShell>

                  <SectionShell title="Map Layers">
                    <MapLayers
                      showTraffic={state.showTraffic}
                      showWeather={state.showWeather}
                      showIncidents={state.showIncidents}
                      onToggleTraffic={onToggleTraffic}
                      onToggleWeather={onToggleWeather}
                      onToggleIncidents={onToggleIncidents}
                    />
                  </SectionShell>

                  <SectionShell title="Prototype Notes">
                    <div className="rounded-xl border border-surface-100 bg-surface-50 px-3 py-3 text-[11px] leading-relaxed text-slate-600">
                      Scenario and layer toggles are grouped here so the default command screen stays focused on the dispatch decision. These controls remain useful for demo walkthroughs and what-if exploration.
                    </div>
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
