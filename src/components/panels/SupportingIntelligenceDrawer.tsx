"use client";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
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
  UrbanBuildingContext,
  UrbanBuildingSelectionOptions,
} from "@/types";
import { REGIONS } from "@/data/mock";
import { SCENARIO_CONFIGS } from "@/lib/scenarios";
import RecommendedActionCard from "@/components/panels/RecommendedActionCard";
import MapLayers from "@/components/panels/MapLayers";
import WeatherOutlook from "@/components/panels/WeatherOutlook";
import RegionStatus from "@/components/panels/RegionStatus";
import StationCard from "@/components/panels/StationCard";
import RoutePlannerCard from "@/components/panels/RoutePlannerCard";
import AIInsightsList from "@/components/panels/AIInsightsList";
import TrafficCameraPanel from "@/components/panels/TrafficCameraPanel";
import UrbanIncidentContextCard from "@/components/panels/UrbanIncidentContextCard";
import ResponseCorridor3D from "@/components/map/ResponseCorridor3D";
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
  scenario: ScenarioPreset;
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
  scenario,
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
}: Props) {
  const scenarioConfig = SCENARIO_CONFIGS[scenario];
  const selectedIncident = incidents.find((incident) => incident.id === routeIncidentId) ?? incidents[0] ?? null;
  const focusStation = selectedStation ?? recommendedAction?.station ?? null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ x: 28, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 28, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="z-20 flex min-h-0 w-[340px] shrink-0 flex-col border-l border-surface-200 bg-surface-50/95 shadow-[0_22px_60px_rgba(15,23,42,0.18)] backdrop-blur"
        >
          <div className="border-b border-surface-200 bg-white/75 p-3">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <SupportingIntelligenceTabs activeTab={activeTab} onChange={onTabChange} />
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
                />
              </div>
            )}

            {activeTab === "coverage" && (
              <div className="space-y-3">
                <SectionShell title="Focused Station">
                  <StationCard station={focusStation} timeOffset={timeOffset} weatherImpact={selectedStationWeatherImpact} />
                </SectionShell>

                <SectionShell title="Regional Status">
                  <RegionStatus regions={REGIONS} timeOffset={timeOffset} weatherImpacts={weatherRegionImpacts} showHeader={false} />
                </SectionShell>
              </div>
            )}

            {activeTab === "forecasting" && (
              <div className="space-y-3">
                <SectionShell title="Operational Insights">
                  <AIInsightsList insights={insights} showHeader={false} />
                </SectionShell>
              </div>
            )}

            {activeTab === "demo" && (
              <div className="space-y-3">
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
      )}
    </AnimatePresence>
  );
}
