"use client";
import type { ReactNode } from "react";
import { Activity, Brain, MapPinned, Siren } from "lucide-react";
import type {
  AIInsight,
  FireStation,
  Incident,
  IncidentFilter,
  RecommendedAction,
  ViewMode,
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
  overallHealth: number;
  avgResponseTime: number;
  insights: AIInsight[];
  canOpenUrbanContext: boolean;
  onFocusStation: (station: FireStation) => void;
  onFocusIncident: (incident: Incident) => void;
  onIncidentTypeChange: (type: IncidentFilter) => void;
  onOpenSupportingTab: (tab: SupportingIntelligenceTab) => void;
  onOpenUrbanContext: () => void;
}

const VIEW_COPY: Record<ViewMode, {
  title: string;
  subtitle: string;
  incidentHint: string;
}> = {
  coverage: {
    title: "Coverage Surface",
    subtitle: "Station reachability and response-zone health",
    incidentHint: "Select an incident to see where local demand is stressing the station network.",
  },
  response: {
    title: "Effective Response",
    subtitle: "First intervention timing and incident-level response",
    incidentHint: "Select an incident to compare likely intervention timing and lead dispatch posture.",
  },
};

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

function chipTone(type: "good" | "watch" | "critical" | "neutral") {
  if (type === "good") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (type === "watch") return "border-amber-200 bg-amber-50 text-amber-700";
  if (type === "critical") return "border-red-200 bg-red-50 text-red-700";
  return "border-surface-200 bg-surface-50 text-slate-600";
}

function insightTone(severity: AIInsight["severity"]) {
  if (severity === "critical") return "border-red-200 bg-red-50 text-red-700";
  if (severity === "warning") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function responsePosture(action: RecommendedAction | null, activeView: ViewMode, overallHealth: number) {
  if (!action) {
    return {
      label: activeView === "coverage" ? "Awaiting coverage recommendation" : "Awaiting incident recommendation",
      tone: "neutral" as const,
    };
  }

  if (activeView === "coverage") {
    if (overallHealth < 75) return { label: "Coverage risk elevated", tone: "critical" as const };
    if (overallHealth < 85) return { label: "Coverage pressure rising", tone: "watch" as const };
    return { label: "Coverage posture stable", tone: "good" as const };
  }

  if (action.predictedResponseTime > 11) return { label: "Response window stretched", tone: "critical" as const };
  if (action.predictedResponseTime > 8) return { label: "Response margin reduced", tone: "watch" as const };
  return { label: "Response posture stable", tone: "good" as const };
}

function metricTone(value: number, goodThreshold: number, watchThreshold: number) {
  if (value <= goodThreshold) return "good" as const;
  if (value <= watchThreshold) return "watch" as const;
  return "critical" as const;
}

export default function CommandSummaryPanel({
  activeView,
  selectedIncident,
  selectedIncidentId,
  incidents,
  incidentType,
  selectedStation,
  recommendedAction,
  overallHealth,
  avgResponseTime,
  insights,
  canOpenUrbanContext,
  onFocusStation,
  onFocusIncident,
  onIncidentTypeChange,
  onOpenSupportingTab,
  onOpenUrbanContext,
}: Props) {
  const viewCopy = VIEW_COPY[activeView];
  const topInsight = insights[0] ?? null;
  const activeCallsTone = incidents.length >= 6 ? "watch" : "neutral";
  const coverageTone = overallHealth >= 85 ? "good" : overallHealth >= 75 ? "watch" : "critical";
  const etaTone = metricTone(avgResponseTime, 8, 11);
  const posture = responsePosture(recommendedAction, activeView, overallHealth);

  return (
    <aside className="z-20 flex w-full shrink-0 flex-col border-b border-surface-200 bg-white/95 backdrop-blur lg:min-h-0 lg:w-[320px] lg:border-b-0 lg:border-r xl:w-[340px]">
      <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
        <div className="space-y-3">
          <section className="rounded-2xl border border-surface-200 bg-[linear-gradient(180deg,rgba(248,250,252,1),rgba(255,255,255,1))] p-3 shadow-sm">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Command Summary
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{viewCopy.title}</div>
            <div className="mt-1 text-[11px] leading-relaxed text-slate-500">{viewCopy.subtitle}</div>
          </section>

          <RecommendedActionCard
            action={recommendedAction}
            selectedStation={selectedStation}
            scenarioLabel={viewCopy.title}
            onFocusStation={onFocusStation}
            onViewEvidence={() => onOpenSupportingTab("evidence")}
            onOpenContext={canOpenUrbanContext ? onOpenUrbanContext : undefined}
            evidenceLabel="View Evidence"
            contextLabel="Open 3D Context"
          />

          <SectionShell title="Critical Status Snapshot">
            <div className="flex flex-wrap gap-2">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${chipTone(activeCallsTone)}`}>
                <Siren size={12} />
                {incidents.length} active calls
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${chipTone(activeView === "coverage" ? coverageTone : etaTone)}`}>
                <Activity size={12} />
                {activeView === "coverage" ? `${overallHealth}% coverage health` : `${avgResponseTime.toFixed(1)}m average appliance ETA`}
              </div>
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold ${chipTone(posture.tone)}`}>
                {posture.label}
              </div>
            </div>
          </SectionShell>

          <SectionShell title="Selected Incident Summary">
            {selectedIncident ? (
              <div className="rounded-xl border border-surface-100 bg-surface-50 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-400">
                      <MapPinned size={10} className="text-slate-400" />
                      Active focus
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{selectedIncident.desc}</div>
                    <div className="mt-1 text-[11px] leading-relaxed text-slate-500">{viewCopy.incidentHint}</div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
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
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {selectedIncident.severity}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-surface-200 bg-surface-50 px-3 py-4 text-[11px] leading-relaxed text-slate-500">
                {viewCopy.incidentHint}
              </div>
            )}
          </SectionShell>

          <SectionShell title="Compact Incident Feed">
            <div className="space-y-3">
              <IncidentSelector value={incidentType} onChange={onIncidentTypeChange} />
              <IncidentFeed
                incidents={incidents}
                selectedIncidentId={selectedIncidentId}
                onSelectIncident={onFocusIncident}
                compact
                maxVisible={6}
              />
            </div>
          </SectionShell>

          <SectionShell
            title="Top Operational Insight"
            action={(
              <button
                type="button"
                onClick={() => onOpenSupportingTab("forecast-controls")}
                className="text-[11px] font-semibold text-brand-700 transition-colors hover:text-brand-800"
              >
                View all insights
              </button>
            )}
          >
            {topInsight ? (
              <div className="rounded-xl border border-surface-100 bg-surface-50 p-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${insightTone(topInsight.severity)}`}>
                    {topInsight.severity}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                    {topInsight.region}
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                    <Brain size={11} className="text-slate-400" />
                    AI-assisted insight
                  </span>
                </div>
                <div className="mt-2 text-xs font-semibold text-slate-900">
                  {topInsight.prediction ?? topInsight.text}
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {topInsight.action ?? topInsight.impact ?? topInsight.text}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-surface-200 bg-white px-3 py-4 text-[11px] text-slate-500">
                Operational insights will appear here when the prototype forecast layer detects a useful signal.
              </div>
            )}
          </SectionShell>
        </div>
      </div>
    </aside>
  );
}
