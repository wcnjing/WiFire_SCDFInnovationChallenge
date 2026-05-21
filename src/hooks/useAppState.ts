"use client";
import { useState, useCallback, useMemo } from "react";
import type { AppState, FireStation, ViewMode, IncidentFilter, TimeOffset } from "@/types";
import { FIRE_STATIONS, INCIDENTS, REGIONS } from "@/data/mock";
import { calculateOverallHealth, calculateAvgResponseTime } from "@/lib/coverage";

const init: AppState = {
  activeView: "coverage", timeOffset: 0, selectedStation: null,
  leftPanelOpen: true, rightPanelOpen: true,
  showTraffic: true, showWeather: false, showIncidents: true,
  incidentType: "all",
};

export function useAppState() {
  const [state, setState] = useState<AppState>(init);
  const set = (patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch }));

  const actions = {
    setView: useCallback((v: ViewMode) => set({ activeView: v, selectedStation: null }), []),
    setTimeOffset: useCallback((t: TimeOffset) => set({ timeOffset: t }), []),
    selectStation: useCallback((s: FireStation | null) => set({ selectedStation: s }), []),
    toggleLeftPanel: useCallback(() => setState((s) => ({ ...s, leftPanelOpen: !s.leftPanelOpen })), []),
    toggleRightPanel: useCallback(() => setState((s) => ({ ...s, rightPanelOpen: !s.rightPanelOpen })), []),
    toggleTraffic: useCallback(() => setState((s) => ({ ...s, showTraffic: !s.showTraffic })), []),
    toggleWeather: useCallback(() => setState((s) => ({ ...s, showWeather: !s.showWeather })), []),
    toggleIncidents: useCallback(() => setState((s) => ({ ...s, showIncidents: !s.showIncidents })), []),
    setIncidentType: useCallback((t: IncidentFilter) => set({ incidentType: t }), []),
  };

  const filteredIncidents = useMemo(() => {
    return INCIDENTS.filter((i) => {
      if (state.incidentType === "all") return true;
      if (state.incidentType === "fire") return i.type === "fire";
      return i.type === "medical";
    });
  }, [state.incidentType]);

  const overallHealth = useMemo(() => calculateOverallHealth(REGIONS, state.timeOffset), [state.timeOffset]);
  const avgResponseTime = useMemo(() => calculateAvgResponseTime(FIRE_STATIONS, state.timeOffset), [state.timeOffset]);

  return { state, actions, derived: { filteredIncidents, overallHealth, avgResponseTime } };
}
