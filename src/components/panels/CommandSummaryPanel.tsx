"use client";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Brain,
  Siren,
  ThermometerSun,
  TrafficCone,
} from "lucide-react";
import type {
  AIInsight,
  FireStation,
  Incident,
  IncidentFilter,
  OneMapRouteData,
  OneMapRouteMode,
  RecommendedAction,
  SourceStatus,
  TimeOffset,
  ViewMode,
  WeatherSummary,
  WeatherStationImpact,
} from "@/types";
import type { LTATravelTime } from "@/hooks/useLTAData";
import type { SupportingIntelligenceTab } from "@/components/panels/SupportingIntelligenceTabs";
import RecommendedActionCard from "@/components/panels/RecommendedActionCard";
import IncidentFeed from "@/components/panels/IncidentFeed";
import IncidentSelector from "@/components/panels/IncidentSelector";
import TimeSlider from "@/components/panels/TimeSlider";

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
  ltaStatus: SourceStatus;
  ltaTravelTimes: LTATravelTime[];
  oneMapRoute: OneMapRouteData | null;
  routeMode: OneMapRouteMode;
  timeOffset: TimeOffset;
  insights: AIInsight[];
  weatherSummary: WeatherSummary;
  onTimeChange: (offset: TimeOffset) => void;
  onFocusStation: (station: FireStation) => void;
  onFocusIncident: (incident: Incident) => void;
  onIncidentTypeChange: (type: IncidentFilter) => void;
  onOpenRecommendationEvidence: () => void;
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

function formatMinutes(value: number) {
  return `${value.toFixed(1)} min`;
}

function parseTravelTimeMinutes(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function severityTone(severity: AIInsight["severity"]) {
  if (severity === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function weatherNeedsAttention(summary: WeatherSummary) {
  const forecast = summary.twentyFourGeneralForecast?.toLowerCase() ?? "";
  return (
    summary.topRegionPenalty >= 0.55
    || summary.peakRainfall >= 1
    || forecast.includes("thunder")
    || forecast.includes("heavy")
  );
}

function buildTrafficSummary(params: {
  oneMapRoute: OneMapRouteData | null;
  selectedIncident: Incident | null;
  selectedStation: FireStation | null;
  routeMode: OneMapRouteMode;
  ltaTravelTimes: LTATravelTime[];
  ltaStatus: SourceStatus;
}) {
  const segments = params.ltaTravelTimes
    .map((segment) => {
      const minutes = parseTravelTimeMinutes(segment.EstTime);
      return minutes === null ? null : { ...segment, minutes };
    })
    .filter((segment): segment is LTATravelTime & { minutes: number } => segment !== null)
    .sort((left, right) => right.minutes - left.minutes);

  const slowestSegment = segments[0] ?? null;

  if (params.oneMapRoute && params.selectedIncident && params.selectedStation) {
    const routeMinutes = Math.max(params.oneMapRoute.summary.totalTimeSeconds / 60, 0.1);

    return {
      headline: `${params.routeMode.toUpperCase()} route to ${params.selectedIncident.desc}`,
      detail: `${params.selectedStation.name} to incident target is currently ${formatMinutes(routeMinutes)}.`,
      corridor: slowestSegment?.Name ?? null,
      etaImpact: slowestSegment ? `${slowestSegment.Name} currently shows ${slowestSegment.minutes} min corridor travel.` : null,
    };
  }

  if (slowestSegment) {
    return {
      headline: `${slowestSegment.Name} is the key disrupted corridor`,
      detail: `${slowestSegment.StartPoint} to ${slowestSegment.EndPoint} towards ${slowestSegment.FarEndPoint}.`,
      corridor: slowestSegment.Name,
      etaImpact: `${slowestSegment.minutes} min corridor ETA.`,
    };
  }

  if (params.ltaStatus.mode === "mock") {
    return {
      headline: "Traffic view is running in prototype fallback mode",
      detail: "Simulated LTA traffic conditions are being used so the operational demo remains available.",
      corridor: null,
      etaImpact: null,
    };
  }

  return {
    headline: "Traffic conditions are loading",
    detail: "Open supporting intelligence to review corridor evidence, route metrics, and traffic camera context.",
    corridor: null,
    etaImpact: null,
  };
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
  ltaStatus,
  ltaTravelTimes,
  oneMapRoute,
  routeMode,
  timeOffset,
  insights,
  weatherSummary,
  onTimeChange,
  onFocusStation,
  onFocusIncident,
  onIncidentTypeChange,
  onOpenRecommendationEvidence,
  onOpenSupportingTab,
}: Props) {
  const focusStation = selectedStation ?? recommendedAction?.station ?? null;
  const trafficSummary = buildTrafficSummary({
    oneMapRoute,
    selectedIncident,
    selectedStation,
    routeMode,
    ltaTravelTimes,
    ltaStatus,
  });
  const topInsights = insights.slice(0, 2);
  const viewContext = activeView === "coverage"
    ? {
        label: "Live Coverage Surface",
        description: "Area reachability under current traffic, weather, and disruption conditions.",
      }
    : {
        label: "Effective Response Time",
        description: "Fastest competent intervention view using the current prototype response model.",
      };
  const needsWeatherAttention = weatherNeedsAttention(weatherSummary);
  const selectedDiffersFromRecommendation = Boolean(
    selectedStation
    && recommendedAction
    && selectedStation.id !== recommendedAction.station.id,
  );

  return (
    <aside className="z-20 flex max-h-[46vh] w-full shrink-0 flex-col border-b border-surface-200 bg-white/95 backdrop-blur lg:max-h-none lg:w-[320px] lg:border-b-0 lg:border-r xl:w-[340px]">
      <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
        <div className="mb-3 rounded-2xl border border-surface-200 bg-[linear-gradient(135deg,rgba(248,250,252,1),rgba(239,246,255,0.96))] p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Siren size={14} className="text-brand-700" />
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700">Command Summary</div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">{viewContext.label}</h2>
            <span className="rounded-full border border-surface-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              +{timeOffset}m horizon
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{viewContext.description}</p>
        </div>

        <div className="space-y-3">
          <RecommendedActionCard
            action={recommendedAction}
            selectedStation={selectedStation}
            scenarioLabel={activeView === "coverage" ? "Coverage view" : "Response view"}
            onFocusStation={onFocusStation}
            onViewEvidence={onOpenRecommendationEvidence}
            evidenceLabel="Why this recommendation?"
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
            title="Key Traffic Conditions"
            action={(
              <button
                type="button"
                onClick={() => onOpenSupportingTab("route")}
                className="text-[11px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
              >
                View evidence
              </button>
            )}
          >
            <div className="rounded-xl border border-surface-100 bg-surface-50 p-3">
              <div className="flex items-start gap-2">
                <TrafficCone size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <div>
                  <div className="text-sm font-semibold text-slate-900">{trafficSummary.headline}</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-slate-600">{trafficSummary.detail}</div>
                </div>
              </div>
              {(trafficSummary.corridor || trafficSummary.etaImpact) && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-surface-100 bg-white p-2.5">
                    <div className="text-[10px] text-slate-400">Key corridor</div>
                    <div className="text-xs font-semibold text-slate-900">{trafficSummary.corridor ?? "Monitoring"}</div>
                  </div>
                  <div className="rounded-xl border border-surface-100 bg-white p-2.5">
                    <div className="text-[10px] text-slate-400">ETA impact</div>
                    <div className="text-xs font-semibold text-slate-900">{trafficSummary.etaImpact ?? "No material delay"}</div>
                  </div>
                </div>
              )}
            </div>
          </SectionShell>

          <SectionShell title="Prediction Window">
            <TimeSlider value={timeOffset} onChange={onTimeChange} />
          </SectionShell>

          {needsWeatherAttention && (
            <SectionShell
              title="Environment Watch"
              action={(
                <button
                  type="button"
                  onClick={() => onOpenSupportingTab("environment")}
                  className="text-[11px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
                >
                  Open details
                </button>
              )}
            >
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                <div className="flex items-start gap-2">
                  <ThermometerSun size={14} className="mt-0.5 shrink-0 text-blue-600" />
                  <div>
                    <div className="text-sm font-semibold text-blue-900">
                      {weatherSummary.topRegion
                        ? `${weatherSummary.topRegion} is carrying the highest weather drag`
                        : "Weather conditions need attention"}
                    </div>
                    <div className="mt-1 text-[11px] leading-relaxed text-blue-800">
                      {weatherSummary.topRegionForecast ?? weatherSummary.twentyFourGeneralForecast ?? "Localized rain and forecast pressure are affecting travel confidence."}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-blue-100 bg-white p-2.5">
                    <div className="text-[10px] text-blue-500">Operational drag</div>
                    <div className="text-sm font-bold font-mono text-blue-900">+{weatherSummary.topRegionPenalty.toFixed(1)}m</div>
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-white p-2.5">
                    <div className="text-[10px] text-blue-500">Peak rainfall</div>
                    <div className="text-sm font-bold font-mono text-blue-900">
                      {weatherSummary.peakRainStation ? `${weatherSummary.peakRainfall.toFixed(1)} mm` : "No hotspot"}
                    </div>
                  </div>
                </div>
              </div>
            </SectionShell>
          )}

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
