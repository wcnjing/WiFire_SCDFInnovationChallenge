"use client";
import { motion } from "framer-motion";
import { Shield, Layers, Heart } from "lucide-react";
import type { ViewMode } from "@/types";
import { useClock } from "@/hooks/useLiveTick";

type SourceMode = "live" | "loading" | "mock" | "error" | "stale";

export interface SourceStatus {
  label: string;
  mode: SourceMode;
  updatedLabel?: string;
}

interface TopBarProps {
  activeView: ViewMode;
  onViewChange: (v: ViewMode) => void;
  sourceStatuses: SourceStatus[];
}

const sourceStyles: Record<SourceMode, { dot: string; pill: string; text: string; label: string }> = {
  live:    { dot: "bg-green-500",   pill: "bg-green-50 border-green-200",  text: "text-green-700",  label: "LIVE" },
  loading: { dot: "bg-amber-400",   pill: "bg-amber-50 border-amber-200",  text: "text-amber-700",  label: "LOADING" },
  mock:    { dot: "bg-violet-500",  pill: "bg-violet-50 border-violet-200", text: "text-violet-700", label: "MOCK" },
  error:   { dot: "bg-red-500",     pill: "bg-red-50 border-red-200",      text: "text-red-700",    label: "ERROR" },
  stale:   { dot: "bg-slate-400",   pill: "bg-slate-50 border-slate-200",  text: "text-slate-700",  label: "STALE" },
};

export default function TopBar({ activeView, onViewChange, sourceStatuses }: TopBarProps) {
  const clock = useClock();
  const views: { key: ViewMode; label: string; icon: typeof Layers }[] = [
    { key: "coverage", label: "Live Coverage Surface", icon: Layers },
    { key: "response", label: "Effective Response Time", icon: Heart },
  ];

  return (
    <header className="h-12 bg-white border-b border-surface-200 flex items-center justify-between px-4 z-50 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 bg-brand-800 rounded-md flex items-center justify-center">
          <Shield size={15} className="text-white" />
        </div>
        <span className="font-bold text-sm text-slate-900 tracking-tight">RZTB Mapper</span>
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Coverage Intelligence Platform</span>
      </div>

      <div className="flex gap-0.5 bg-surface-100 p-[3px] rounded-lg">
        {views.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => onViewChange(key)}
            className={`relative px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors duration-200 ${activeView === key ? "text-brand-800" : "text-slate-400 hover:text-slate-600"}`}>
            {activeView === key && (
              <motion.div layoutId="viewIndicator" className="absolute inset-0 bg-white rounded-md shadow-sm"
                transition={{ type: "spring", duration: 0.35, bounce: 0.15 }} />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Icon size={13} /><span className="hidden md:inline">{label}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden xl:flex items-center gap-1.5">
          {sourceStatuses.map((source) => {
            const style = sourceStyles[source.mode];
            return (
              <div key={source.label} className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${style.pill}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                <span className={`text-[10px] font-semibold tracking-wide ${style.text}`}>
                  {source.label} {style.label}
                </span>
                {source.updatedLabel && (
                  <span className="text-[10px] text-slate-400 font-mono">{source.updatedLabel}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-semibold text-green-600 tracking-wide">SYSTEM LIVE</span>
        </div>
        <span className="font-mono text-xs text-slate-400 tabular-nums w-[60px]">{clock}</span>
      </div>
    </header>
  );
}
