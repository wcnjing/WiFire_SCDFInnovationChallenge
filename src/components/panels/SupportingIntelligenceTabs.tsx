"use client";
import { Brain, CloudRain, Layers3, Route, SlidersHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SupportingIntelligenceTab = "route" | "environment" | "coverage" | "forecasting" | "demo";

const TAB_DEFS: {
  id: SupportingIntelligenceTab;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "route", label: "Route Evidence", icon: Route },
  { id: "environment", label: "Environment", icon: CloudRain },
  { id: "coverage", label: "Coverage & Regions", icon: Layers3 },
  { id: "forecasting", label: "AI & Forecasting", icon: Brain },
  { id: "demo", label: "Demo Controls", icon: SlidersHorizontal },
];

interface Props {
  activeTab: SupportingIntelligenceTab;
  onChange: (tab: SupportingIntelligenceTab) => void;
}

export default function SupportingIntelligenceTabs({ activeTab, onChange }: Props) {
  return (
    <div className="scrollbar-thin flex gap-1 overflow-x-auto rounded-xl bg-surface-100 p-1">
      {TAB_DEFS.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`inline-flex min-w-max items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors ${
              active
                ? "bg-white text-brand-800 shadow-sm"
                : "text-slate-500 hover:bg-white/70 hover:text-slate-700"
            }`}
          >
            <Icon size={12} className={active ? "text-brand-700" : "text-slate-400"} />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
