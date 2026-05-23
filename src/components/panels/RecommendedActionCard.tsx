"use client";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import type { FireStation, RecommendedAction } from "@/types";

interface Props {
  action: RecommendedAction | null;
  selectedStation: FireStation | null;
  scenarioLabel: string;
  onFocusStation: (station: FireStation) => void;
}

function formatMinutes(value: number) {
  return `${value.toFixed(1)} min`;
}

export default function RecommendedActionCard({ action, selectedStation, scenarioLabel, onFocusStation }: Props) {
  if (!action) {
    return (
      <div className="rounded-2xl border border-surface-200 bg-white/95 p-4 shadow-sm">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          <Sparkles size={12} className="text-brand-500" />
          Recommended Action
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Awaiting operational inputs before generating a command recommendation.
        </p>
      </div>
    );
  }

  const isSelected = selectedStation?.id === action.station.id;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className="rounded-2xl border border-brand-100 bg-[linear-gradient(135deg,rgba(219,234,254,0.88),rgba(255,255,255,0.98))] p-4 shadow-[0_14px_40px_rgba(30,64,175,0.12)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-700">
            <Sparkles size={12} className="text-brand-600" />
            Recommended Action
          </div>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{action.station.name}</h2>
            <span className="rounded-full border border-brand-200 bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
              {scenarioLabel}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-brand-200 bg-white/90 px-3 py-2 text-right shadow-sm">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Predicted response</div>
          <div className="text-lg font-bold font-mono text-brand-900">{formatMinutes(action.predictedResponseTime)}</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/70 bg-white/80 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Reason</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{action.reason}</p>
        </div>
        <div className="rounded-xl border border-white/70 bg-white/80 p-3">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Coverage impact</div>
          <p className="mt-1 text-xs leading-relaxed text-slate-700">{action.coverageImpact}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            <ShieldCheck size={11} />
            {action.confidence}% confidence
          </div>
          {isSelected && (
            <div className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
              Selected on map
            </div>
          )}
        </div>
        {!isSelected && (
          <button
            type="button"
            onClick={() => onFocusStation(action.station)}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-50"
          >
            Focus station
            <ArrowRight size={12} />
          </button>
        )}
      </div>
    </motion.section>
  );
}
