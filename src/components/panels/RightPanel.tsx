"use client";
import { motion, AnimatePresence } from "framer-motion";
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
} from "@/types";
import type { LTATravelTime } from "@/hooks/useLTAData";
import { FIRE_STATIONS, REGIONS } from "@/data/mock";
import { KPIGrid } from "@/components/dashboard/KPICard";
import TimeSlider from "@/components/panels/TimeSlider";
import MapLayers from "@/components/panels/MapLayers";
import IncidentSelector from "@/components/panels/IncidentSelector";
import WeatherOutlook from "@/components/panels/WeatherOutlook";
import RegionStatus from "@/components/panels/RegionStatus";
import StationCard from "@/components/panels/StationCard";
import IncidentFeed from "@/components/panels/IncidentFeed";
import RoutePlannerCard from "@/components/panels/RoutePlannerCard";
import TravelTimesCard from "@/components/panels/TravelTimesCard";
import AIInsightsList from "@/components/panels/AIInsightsList";

interface Props {
  state: AppState;
  isOpen: boolean; selectedStation: FireStation | null; timeOffset: TimeOffset;
  incidents: Incident[]; insights: AIInsight[];
  selectedStationWeatherImpact?: WeatherStationImpact | null;
  overallHealth: number;
  avgResponseTime: number;
  onTimeChange: (o: TimeOffset) => void;
  onToggleTraffic: () => void;
  onToggleWeather: () => void;
  onToggleIncidents: () => void;
  onIncidentTypeChange: (t: IncidentFilter) => void;
  weatherSummary: WeatherSummary;
  weatherRegionImpacts: WeatherRegionImpact[];
  travelTimes: LTATravelTime[];
  travelTimesLoading: boolean;
  travelTimesError: string | null;
  travelTimesFetchedAt: number | null;
  routeIncidentId: number | null;
  onRouteIncidentChange: (incidentId: number) => void;
  routeMode: OneMapRouteMode;
  onRouteModeChange: (mode: OneMapRouteMode) => void;
  oneMapRoute: OneMapRouteData | null;
  oneMapRouteLoading: boolean;
  oneMapRouteError: string | null;
  oneMapRouteFetchedAt: number | null;
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
  onTimeChange,
  onToggleTraffic,
  onToggleWeather,
  onToggleIncidents,
  onIncidentTypeChange,
  weatherSummary,
  weatherRegionImpacts,
  travelTimes,
  travelTimesLoading,
  travelTimesError,
  travelTimesFetchedAt,
  routeIncidentId,
  onRouteIncidentChange,
  routeMode,
  onRouteModeChange,
  oneMapRoute,
  oneMapRouteLoading,
  oneMapRouteError,
  oneMapRouteFetchedAt,
}: Props) {
  const kpis = [
    { label: "Coverage Health", value: `${overallHealth}%`, status: overallHealth >= 85 ? "green" as const : overallHealth >= 75 ? "amber" as const : "red" as const },
    { label: "Avg Response", value: `${avgResponseTime.toFixed(1)}m`, status: avgResponseTime <= 8 ? "green" as const : avgResponseTime <= 11 ? "amber" as const : "red" as const },
    { label: "Active Incidents", value: incidents.length, status: "neutral" as const },
    { label: "Stations Online", value: `${FIRE_STATIONS.length}/${FIRE_STATIONS.length}`, status: "green" as const },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="bg-white border-l border-surface-200 flex flex-col overflow-y-auto shrink-0 z-20 scrollbar-thin">
          <div className="p-3 border-b border-surface-100">
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Operational Status</div>
            <KPIGrid items={kpis} />
          </div>
          <div className="p-3 border-b border-surface-100">
            <TimeSlider value={state.timeOffset} onChange={onTimeChange} />
          </div>
          <div className="p-3 border-b border-surface-100">
            <MapLayers
              showTraffic={state.showTraffic}
              showWeather={state.showWeather}
              showIncidents={state.showIncidents}
              onToggleTraffic={onToggleTraffic}
              onToggleWeather={onToggleWeather}
              onToggleIncidents={onToggleIncidents}
            />
          </div>
          {state.activeView === "response" && (
            <div className="p-3 border-b border-surface-100">
              <IncidentSelector value={state.incidentType} onChange={onIncidentTypeChange} />
            </div>
          )}
          <StationCard station={selectedStation} timeOffset={timeOffset} weatherImpact={selectedStationWeatherImpact} />
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
          <div className="p-3 border-b border-surface-100">
            <WeatherOutlook summary={weatherSummary} regionImpacts={weatherRegionImpacts} timeOffset={state.timeOffset} />
          </div>
          <div className="p-3 border-b border-surface-100">
            <RegionStatus regions={REGIONS} timeOffset={state.timeOffset} weatherImpacts={weatherRegionImpacts} />
          </div>
          <IncidentFeed incidents={incidents} />
          <TravelTimesCard travelTimes={travelTimes} loading={travelTimesLoading} error={travelTimesError} fetchedAt={travelTimesFetchedAt} />
          <AIInsightsList insights={insights} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
