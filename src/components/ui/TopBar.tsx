"use client";
import { motion } from "framer-motion";
import { Shield, Layers, Heart } from "lucide-react";
import type { ViewMode } from "@/types";
import { useClock } from "@/hooks/useLiveTick";

interface TopBarProps { activeView: ViewMode; onViewChange: (v: ViewMode) => void; }

export default function TopBar({ activeView, onViewChange }: TopBarProps) {
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
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-semibold text-green-600 tracking-wide">SYSTEM LIVE</span>
        </div>
        <span className="font-mono text-xs text-slate-400 tabular-nums w-[60px]">{clock}</span>
      </div>
    </header>
  );
}
