"use client";
import { FIRE_STATIONS, INCIDENTS, AI_INSIGHTS } from "@/data/mock";
import { useAppState } from "@/hooks/useAppState";
import TopBar from "@/components/ui/TopBar";
import PanelToggle from "@/components/ui/PanelToggle";
import LeftPanel from "@/components/panels/LeftPanel";
import RightPanel from "@/components/panels/RightPanel";
import SingaporeMap from "@/components/map/SingaporeMap";
import { AIBanner, MapLegend, FloatingAlert } from "@/components/map/MapOverlays";
import { useLTAIncidents, useLTASpeedBands } from "@/hooks/useLTAData";
import { useNEAWeather } from "@/hooks/useNEAWeather";

export default function HomePage() {
  const { state, actions, derived } = useAppState();
  const { data: ltaIncidents } = useLTAIncidents();
  const { data: ltaSpeedBands } = useLTASpeedBands();
  const { data: neaWeather } = useNEAWeather();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar activeView={state.activeView} onViewChange={actions.setView} />
      <div className="flex-1 flex overflow-hidden relative">
        <PanelToggle side="left" isOpen={state.leftPanelOpen} onClick={actions.toggleLeftPanel} />
        <LeftPanel state={state} overallHealth={derived.overallHealth} avgResponseTime={derived.avgResponseTime}
          onTimeChange={actions.setTimeOffset} onToggleTraffic={actions.toggleTraffic} onToggleWeather={actions.toggleWeather}
          onToggleIncidents={actions.toggleIncidents} onIncidentTypeChange={actions.setIncidentType} />
        <div className="flex-1 relative overflow-hidden bg-surface-50">
          <div className="w-full h-full">
            <SingaporeMap stations={FIRE_STATIONS} incidents={derived.filteredIncidents} selectedStation={state.selectedStation}
              onStationClick={actions.selectStation} timeOffset={state.timeOffset} activeView={state.activeView}
              showTraffic={state.showTraffic} showWeather={state.showWeather} showIncidents={state.showIncidents}
              ltaIncidents={ltaIncidents} ltaSpeedBands={ltaSpeedBands} neaStations={neaWeather?.stations} neaForecasts={neaWeather?.forecasts} />
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
          timeOffset={state.timeOffset} incidents={INCIDENTS} insights={AI_INSIGHTS} />
      </div>
    </div>
  );
}
