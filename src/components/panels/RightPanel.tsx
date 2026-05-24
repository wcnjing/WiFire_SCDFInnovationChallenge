"use client";
import { AnimatePresence, motion } from "framer-motion";
import type {
  AppState,
  FireStation,
  Incident,
  AIInsight,
  TimeOffset,
  WeatherStationImpact,
  OneMapRouteData,
  OneMapRouteMode,
  IncidentFilter,
  WeatherRegionImpact,
  WeatherSummary,
  RecommendedAction,
  ScenarioPreset,
  SourceStatus,
  TrafficCameraSnapshot,
} from "@/types";
import { FIRE_STATIONS, REGIONS } from "@/data/mock";
import { SCENARIO_CONFIGS } from "@/lib/scenarios";
import { KPIGrid } from "@/components/dashboard/KPICard";
import RecommendedActionCard from "@/components/panels/RecommendedActionCard";
import TimeSlider from "@/components/panels/TimeSlider";
import ScenarioControls from "@/components/panels/ScenarioControls";
import MapLayers from "@/components/panels/MapLayers";
import IncidentSelector from "@/components/panels/IncidentSelector";
import WeatherOutlook from "@/components/panels/WeatherOutlook";
import RegionStatus from "@/components/panels/RegionStatus";
import StationCard from "@/components/panels/StationCard";
import IncidentFeed from "@/components/panels/IncidentFeed";
import RoutePlannerCard from "@/components/panels/RoutePlannerCard";
import AIInsightsList from "@/components/panels/AIInsightsList";
import TrafficCameraPanel from "@/components/panels/TrafficCameraPanel";
import TravelTimesCard from "@/components/panels/TravelTimesCard";
import UrbanIncidentContextCard from "@/components/panels/UrbanIncidentContextCard";
import ResponseCorridor3D from "@/components/map/ResponseCorridor3D";
import type { LTATravelTime } from "@/hooks/useLTAData";

interface Props {
  state: AppState;
  isOpen: boolean;
  selectedStation: FireStation | null;
  timeOffset: TimeOffset;
  incidents: Incident[];
  insights: AIInsight[];
  selectedStationWeatherImpact?: WeatherStationImpact | null;
  overallHealth: number;
  avgResponseTime: number;
  recommendedAction: RecommendedAction | null;
  scenario: ScenarioPreset;
  ltaStatus: SourceStatus;
  neaStatus: SourceStatus;
  onFocusStation: (station: FireStation) => void;
  onScenarioChange: (scenario: ScenarioPreset) => void;
  onTimeChange: (offset: TimeOffset) => void;
  onToggleTraffic: () => void;
  onToggleWeather: () => void;
  onToggleIncidents: () => void;
  onIncidentTypeChange: (type: IncidentFilter) => void;
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
  onFocusIncident: (incident: Incident) => void;
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

function SectionShell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-surface-200 bg-white/95 p-3 shadow-sm">
      {title && <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</div>}
      {children}
    </section>
  );
}

const statusTone = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  loading: "border-amber-200 bg-amber-50 text-amber-700",
  mock: "border-violet-200 bg-violet-50 text-violet-700",
  error: "border-red-200 bg-red-50 text-red-700",
  stale: "border-slate-200 bg-slate-100 text-slate-700",
} as const;

function StatusBadge({ label, status }: { label: string; status?: SourceStatus }) {
  if (!status) {
    return (
      <div className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
        {label}
      </div>
    );
  }

  const modeLabel = status.mode === "live"
    ? "Live"
    : status.mode === "loading"
      ? "Loading"
      : status.mode === "mock"
        ? "Fallback"
        : status.mode === "stale"
          ? "Stale"
          : "Error";

  return (
    <div className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusTone[status.mode]}`}>
      {label} {modeLabel}
    </div>
  );
}

export default function RightPanel({
  state,
  isOpen,
  selectedStation,
  timeOffset,
  incidents,
  insights,
  selectedStationWeatherImpact,
  overallHealth,
  avgResponseTime,
  recommendedAction,
  scenario,
  ltaStatus,
  neaStatus,
  onFocusStation,
  onScenarioChange,
  onTimeChange,
  onToggleTraffic,
  onToggleWeather,
  onToggleIncidents,
  onIncidentTypeChange,
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
  onFocusIncident,
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
  const kpis = [
    { label: "Coverage Health", value: `${overallHealth}%`, status: overallHealth >= 85 ? "green" as const : overallHealth >= 75 ? "amber" as const : "red" as const },
    { label: "Avg Response", value: `${avgResponseTime.toFixed(1)}m`, status: avgResponseTime <= 8 ? "green" as const : avgResponseTime <= 11 ? "amber" as const : "red" as const },
    { label: "Active Incidents", value: incidents.length, status: "neutral" as const },
    { label: "Stations Online", value: `${FIRE_STATIONS.length}/${FIRE_STATIONS.length}`, status: "green" as const },
  ];
  const selectedIncident = incidents.find((incident) => incident.id === routeIncidentId) ?? incidents[0] ?? null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 372, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="scrollbar-thin z-20 flex shrink-0 flex-col overflow-y-auto border-l border-surface-200 bg-surface-50/95 backdrop-blur"
        >
          <div className="space-y-3 p-3">
            <RecommendedActionCard
              action={recommendedAction}
              selectedStation={selectedStation}
              scenarioLabel={scenarioConfig.label}
              onFocusStation={onFocusStation}
            />

            <SectionShell title="Traffic Conditions">
              <div className="space-y-3">
                <RoutePlannerCard
                  station={selectedStation}
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
                <IncidentSelector value={state.incidentType} onChange={onIncidentTypeChange} />
                <IncidentFeed
                  incidents={incidents}
                  selectedIncidentId={routeIncidentId}
                  onSelectIncident={onFocusIncident}
                />
              </div>
            </SectionShell>

            <SectionShell>
              <MapLayers
                showTraffic={state.showTraffic}
                showWeather={state.showWeather}
                showIncidents={state.showIncidents}
                onToggleTraffic={onToggleTraffic}
                onToggleWeather={onToggleWeather}
                onToggleIncidents={onToggleIncidents}
              />
            </SectionShell>

            <SectionShell title="Operational Status">
              <div className="mb-3 flex flex-wrap gap-1.5">
                <StatusBadge label="LTA" status={ltaStatus} />
                <StatusBadge label="NEA" status={neaStatus} />
                <StatusBadge label="AI Forecast On" />
              </div>
              <KPIGrid items={kpis} />
              <div className="mt-3 space-y-3">
                <StationCard station={selectedStation} timeOffset={timeOffset} weatherImpact={selectedStationWeatherImpact} />
              </div>
            </SectionShell>

            <SectionShell>
              <TimeSlider value={state.timeOffset} onChange={onTimeChange} />
              <div className="mt-2 rounded-xl border border-surface-100 bg-surface-50 px-3 py-2 text-[11px] text-slate-500">
                Scenario horizon: <span className="font-semibold text-slate-700">{scenarioConfig.label}</span> - {scenarioConfig.brief}
              </div>
            </SectionShell>

            <SectionShell>
              <ScenarioControls value={scenario} onChange={onScenarioChange} />
            </SectionShell>

            <SectionShell>
              <AIInsightsList insights={insights} />
            </SectionShell>

            <UrbanIncidentContextCard incident={selectedIncident} />

            <ResponseCorridor3D
              selectedStation={selectedStation}
              incidents={incidents}
              selectedIncidentId={routeIncidentId}
              cameras={trafficCameras}
              loading={trafficCameraLoading}
              error={trafficCameraError}
              lastUpdated={trafficCameraLastUpdated}
              onRefresh={onRefreshTrafficCameras}
            />

            <TrafficCameraPanel
              selectedStation={selectedStation}
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

            <SectionShell>
              <WeatherOutlook
                summary={weatherSummary}
                regionImpacts={weatherRegionImpacts}
                timeOffset={state.timeOffset}
                sourceStatus={neaStatus}
              />
            </SectionShell>

            <SectionShell>
              <RegionStatus regions={REGIONS} timeOffset={state.timeOffset} weatherImpacts={weatherRegionImpacts} />
            </SectionShell>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
