"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Zap } from "lucide-react";
import type { TimeOffset, ViewMode } from "@/types";
import { AI_PREDICTIONS, AI_CONFIDENCE } from "@/data/mock";
import { useLiveTick } from "@/hooks/useLiveTick";

export function AIBanner({ timeOffset }: { timeOffset: TimeOffset }) {
  const tick = useLiveTick(5000);
  const confidence = AI_CONFIDENCE[timeOffset] ?? 90;
  const elapsed = tick % 3;
  return (
    <motion.div key={timeOffset} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="bg-white border border-surface-200 rounded-xl p-3 max-w-md shadow-md">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded tracking-wide">AI PREDICTION</span>
        <Brain size={13} className="text-violet-400" />
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{AI_PREDICTIONS[timeOffset]}</p>
      <p className="text-[10px] text-slate-400 mt-1.5">Confidence: {confidence}% · Updated {elapsed === 0 ? "just now" : `${elapsed * 15}s ago`}</p>
    </motion.div>
  );
}

export function MapLegend({ activeView }: { activeView: ViewMode }) {
  const items = [
    { color: "#22c55e", label: "≤ 8 min (Fire target)" },
    { color: "#f59e0b", label: "≤ 11 min (EMS target)" },
    { color: "#ef4444", label: "> 11 min (Degraded)" },
    { color: "#94a3b8", label: "Unavailable" },
    ...(activeView === "response" ? [{ color: "#8b5cf6", label: "Volunteer density" }] : []),
  ];
  return (
    <div className="bg-white border border-surface-200 rounded-lg px-3 py-2.5 shadow-sm">
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {activeView === "coverage" ? "Coverage Zones" : "Response Capacity"}
      </div>
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2 py-0.5">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[11px] text-slate-500">{label}</span>
        </div>
      ))}
    </div>
  );
}

export function FloatingAlert({ visible, message }: { visible: boolean; message: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={{ duration: 0.35 }}
          className="bg-white border border-surface-200 rounded-xl px-3.5 py-2.5 shadow-lg max-w-[280px]">
          <div className="flex items-center gap-1 text-[11px] font-bold text-violet-600 mb-1"><Zap size={12}/>AI ALERT</div>
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
