"use client";
import { Brain, ChevronRight } from "lucide-react";
import type { AIInsight } from "@/types";

const severityTone = {
  critical: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
} as const;

function fallbackConfidence(insight: AIInsight) {
  if (typeof insight.confidence === "number") return insight.confidence;
  if (insight.severity === "critical") return 86;
  if (insight.severity === "warning") return 80;
  return 74;
}

export default function AIInsightsList({ insights }: { insights: AIInsight[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <Brain size={11} className="text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Operational Insights</span>
      </div>

      <div className="space-y-2">
        {insights.map((insight) => {
          const confidence = fallbackConfidence(insight);
          return (
            <div key={insight.id} className="rounded-2xl border border-surface-200 bg-white p-3 shadow-sm transition-colors hover:border-slate-300">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${severityTone[insight.severity]}`}>
                      {insight.severity}
                    </span>
                    <span className="rounded-full bg-surface-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                      {insight.region}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-900">
                    {insight.prediction ?? insight.text}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Confidence</div>
                  <div className="text-sm font-bold font-mono text-slate-800">{confidence}%</div>
                  <div className="text-[10px] text-slate-400">{insight.time}</div>
                </div>
              </div>

              <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-slate-600">
                <div className="rounded-xl border border-surface-100 bg-surface-50 px-3 py-2">
                  <span className="block text-[10px] uppercase tracking-wide text-slate-400">Impact</span>
                  <span>{insight.impact ?? insight.text}</span>
                </div>
                <div className="rounded-xl border border-surface-100 bg-white px-3 py-2">
                  <span className="block text-[10px] uppercase tracking-wide text-slate-400">Suggested action</span>
                  <span className="inline-flex items-start gap-1.5">
                    <ChevronRight size={12} className="mt-0.5 shrink-0 text-brand-500" />
                    <span>{insight.action ?? "Continue monitoring and keep the active dispatch recommendation in view."}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {insights.length === 0 && (
          <div className="rounded-2xl border border-surface-200 bg-white px-3 py-4 text-[11px] text-slate-500 shadow-sm">
            No operational insights are available yet. Prototype forecast cards will appear as soon as the scenario engine produces an update.
          </div>
        )}
      </div>
    </div>
  );
}
