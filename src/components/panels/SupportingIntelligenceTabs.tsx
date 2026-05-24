"use client";
import { Brain, CloudRain, Route } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SupportingIntelligenceTab = "evidence" | "context" | "forecast-controls";

const TAB_DEFS: {
  id: SupportingIntelligenceTab;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "evidence", label: "Evidence", icon: Route },
  { id: "context", label: "Context", icon: CloudRain },
  { id: "forecast-controls", label: "Forecast & Controls", icon: Brain },
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
