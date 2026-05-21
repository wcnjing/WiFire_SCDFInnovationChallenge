"use client";
import { motion, AnimatePresence } from "framer-motion";
import type { AppState, TimeOffset, IncidentFilter, WeatherRegionImpact, WeatherSummary } from "@/types";
import { FIRE_STATIONS, INCIDENTS, REGIONS } from "@/data/mock";
import { KPIGrid } from "@/components/dashboard/KPICard";
import TimeSlider from "@/components/panels/TimeSlider";
import MapLayers from "@/components/panels/MapLayers";
import IncidentSelector from "@/components/panels/IncidentSelector";
import RegionStatus from "@/components/panels/RegionStatus";
import WeatherOutlook from "@/components/panels/WeatherOutlook";

interface Props {
  state: AppState; overallHealth: number; avgResponseTime: number;
  onTimeChange: (o: TimeOffset) => void;
  onToggleTraffic: () => void; onToggleWeather: () => void; onToggleIncidents: () => void;
  onIncidentTypeChange: (t: IncidentFilter) => void;
  weatherSummary: WeatherSummary;
  weatherRegionImpacts: WeatherRegionImpact[];
}

export default function LeftPanel({
  state, overallHealth, avgResponseTime, onTimeChange, onToggleTraffic, onToggleWeather, onToggleIncidents, onIncidentTypeChange,
  weatherSummary, weatherRegionImpacts,
}: Props) {
  const kpis = [
    { label: "Coverage Health", value: `${overallHealth}%`, status: overallHealth >= 85 ? "green" as const : overallHealth >= 75 ? "amber" as const : "red" as const },
    { label: "Avg Response", value: `${avgResponseTime.toFixed(1)}m`, status: avgResponseTime <= 8 ? "green" as const : avgResponseTime <= 11 ? "amber" as const : "red" as const },
    { label: "Active Incidents", value: INCIDENTS.length, status: "neutral" as const },
    { label: "Stations Online", value: `${FIRE_STATIONS.length}/${FIRE_STATIONS.length}`, status: "green" as const },
  ];

  return (
    <AnimatePresence>
      {state.leftPanelOpen && (
        <motion.aside initial={{ width: 0, opacity: 0 }} animate={{ width: 280, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="bg-white border-r border-surface-200 flex flex-col overflow-hidden shrink-0 z-20">
          <div className="overflow-y-auto flex-1 scrollbar-thin">
            <div className="p-3 border-b border-surface-100">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Operational Status</div>
              <KPIGrid items={kpis} />
            </div>
            <div className="p-3 border-b border-surface-100">
              <TimeSlider value={state.timeOffset} onChange={onTimeChange} />
            </div>
            <div className="p-3 border-b border-surface-100">
              <MapLayers showTraffic={state.showTraffic} showWeather={state.showWeather} showIncidents={state.showIncidents}
                onToggleTraffic={onToggleTraffic} onToggleWeather={onToggleWeather} onToggleIncidents={onToggleIncidents} />
            </div>
            {state.activeView === "response" && (
              <div className="p-3 border-b border-surface-100">
                <IncidentSelector value={state.incidentType} onChange={onIncidentTypeChange} />
              </div>
            )}
            <div className="p-3 border-b border-surface-100">
              <WeatherOutlook summary={weatherSummary} regionImpacts={weatherRegionImpacts} timeOffset={state.timeOffset} />
            </div>
            <div className="p-3">
              <RegionStatus regions={REGIONS} timeOffset={state.timeOffset} weatherImpacts={weatherRegionImpacts} />
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
