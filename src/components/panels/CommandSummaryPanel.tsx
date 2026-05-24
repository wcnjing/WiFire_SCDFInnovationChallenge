"use client";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Brain,
} from "lucide-react";
import type {
  AIInsight,
  FireStation,
  Incident,
  IncidentFilter,
  RecommendedAction,
  ViewMode,
  WeatherStationImpact,
} from "@/types";
import type { SupportingIntelligenceTab } from "@/components/panels/SupportingIntelligenceTabs";
import RecommendedActionCard from "@/components/panels/RecommendedActionCard";
import IncidentFeed from "@/components/panels/IncidentFeed";
import IncidentSelector from "@/components/panels/IncidentSelector";

interface Props {
  activeView: ViewMode;
  selectedIncident: Incident | null;
  selectedIncidentId: number | null;
  incidents: Incident[];
  incidentType: IncidentFilter;
  selectedStation: FireStation | null;
  recommendedAction: RecommendedAction | null;
  stationWeatherImpact: WeatherStationImpact | null;
  overallHealth: number;
  avgResponseTime: number;
  insights: AIInsight[];
  onFocusStation: (station: FireStation) => void;
  onFocusIncident: (incident: Incident) => void;
  onIncidentTypeChange: (type: IncidentFilter) => void;
  onOpenSupportingTab: (tab: SupportingIntelligenceTab) => void;
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
    <section className="rounded-2xl border border-surface-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

function severityTone(severity: AIInsight["severity"]) {
  if (severity === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

export default function CommandSummaryPanel({
  activeView,
  selectedIncident,
  selectedIncidentId,
  incidents,
  incidentType,
  selectedStation,
  recommendedAction,
  stationWeatherImpact,
  overallHealth,
  avgResponseTime,
  insights,
  onFocusStation,
  onFocusIncident,
  onIncidentTypeChange,
  onOpenSupportingTab,
}: Props) {
  const focusStation = selectedStation ?? recommendedAction?.station ?? null;
  const topInsights = insights.slice(0, 2);
  const selectedDiffersFromRecommendation = Boolean(
    selectedStation
    && recommendedAction
    && selectedStation.id !== recommendedAction.station.id,
  );

  return (
    <aside className="z-20 flex min-h-0 w-[280px] shrink-0 flex-col border-r border-surface-200 bg-white/95 backdrop-blur">
      <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          <RecommendedActionCard
            action={recommendedAction}
            selectedStation={selectedStation}
            scenarioLabel={activeView === "coverage" ? "Coverage view" : "Response view"}
            onFocusStation={onFocusStation}
          />

          <SectionShell title="Incident & Operational Status">
            <div className="space-y-3">
              <div className="rounded-xl border border-surface-100 bg-surface-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">Selected incident</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {selectedIncident?.desc ?? "No incident selected"}
                    </div>
                  </div>
                  {selectedIncident && (
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        selectedIncident.type === "fire" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                      }`}>
                        {selectedIncident.type}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        selectedIncident.status === "active" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                      }`}>
                        {selectedIncident.status}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  {selectedIncident
                    ? `${selectedIncident.severity.toUpperCase()} priority incident`
                    : "Select an incident from the feed or map to inspect the active recommendation."}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-surface-100 bg-white p-2.5">
                  <div className="text-[10px] text-slate-400">Active calls</div>
                  <div className="text-base font-bold font-mono text-slate-900">{incidents.length}</div>
                </div>
                <div className="rounded-xl border border-surface-100 bg-white p-2.5">
                  <div className="text-[10px] text-slate-400">Coverage health</div>
                  <div className={`text-base font-bold font-mono ${
                    overallHealth >= 85 ? "text-coverage-green" : overallHealth >= 75 ? "text-coverage-amber" : "text-coverage-red"
                  }`}>
                    {overallHealth}%
                  </div>
                </div>
                <div className="rounded-xl border border-surface-100 bg-white p-2.5">
                  <div className="text-[10px] text-slate-400">Avg response</div>
                  <div className={`text-base font-bold font-mono ${
                    avgResponseTime <= 8 ? "text-coverage-green" : avgResponseTime <= 11 ? "text-coverage-amber" : "text-coverage-red"
                  }`}>
                    {avgResponseTime.toFixed(1)}m
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-surface-100 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">
                      {selectedStation ? "Selected station" : recommendedAction ? "Recommended station" : "Station status"}
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {focusStation?.name ?? "No station selected"}
                    </div>
                  </div>
                  {focusStation && (
                    <button
                      type="button"
                      onClick={() => onFocusStation(focusStation)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                    >
                      Focus on map
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>

                {focusStation ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5">
                      <div className="text-[10px] text-slate-400">Readiness</div>
                      <div className="text-sm font-bold font-mono text-slate-900">{focusStation.readiness}%</div>
                    </div>
                    <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5">
                      <div className="text-[10px] text-slate-400">Units</div>
                      <div className="text-sm font-bold font-mono text-slate-900">{focusStation.units}</div>
                    </div>
                    <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5">
                      <div className="text-[10px] text-slate-400">Weather drag</div>
                      <div className={`text-sm font-bold font-mono ${
                        (stationWeatherImpact?.penalty ?? 0) >= 1 ? "text-coverage-red" : (stationWeatherImpact?.penalty ?? 0) >= 0.45 ? "text-coverage-amber" : "text-coverage-green"
                      }`}>
                        +{(stationWeatherImpact?.penalty ?? 0).toFixed(1)}m
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-slate-500">
                    The recommendation card will surface a station once the active operational context is available.
                  </div>
                )}

                {selectedDiffersFromRecommendation && recommendedAction && (
                  <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
                    Current map focus differs from the lead recommendation. The prototype currently prefers {recommendedAction.station.name}.
                  </div>
                )}
              </div>

              <IncidentSelector value={incidentType} onChange={onIncidentTypeChange} />
              <IncidentFeed incidents={incidents} selectedIncidentId={selectedIncidentId} onSelectIncident={onFocusIncident} />
            </div>
          </SectionShell>

          <SectionShell
            title="Operational Insights"
            action={(
              <button
                type="button"
                onClick={() => onOpenSupportingTab("forecasting")}
                className="text-[11px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
              >
                Open full forecast
              </button>
            )}
          >
            <div className="space-y-2">
              {topInsights.map((insight) => (
                <div key={insight.id} className="rounded-xl border border-surface-100 bg-surface-50 p-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityTone(insight.severity)}`}>
                      {insight.severity}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {insight.region}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                      <Brain size={11} className="text-slate-400" />
                      Prototype forecast
                    </span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-slate-900">
                    {insight.prediction ?? insight.text}
                  </div>
                  <div className="mt-1 text-[11px] leading-relaxed text-slate-600">
                    {insight.action ?? insight.impact ?? insight.text}
                  </div>
                </div>
              ))}

              {topInsights.length === 0 && (
                <div className="rounded-xl border border-dashed border-surface-200 bg-white px-3 py-4 text-[11px] text-slate-500">
                  Prototype forecast indicators will appear here when the current scenario produces operational signals.
                </div>
              )}
            </div>
          </SectionShell>
        </div>
      </div>
    </aside>
  );
}
