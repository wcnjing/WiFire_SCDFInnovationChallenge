"use client";
import { Target } from "lucide-react";
import type { IncidentFilter } from "@/types";

interface Props { value: IncidentFilter; onChange: (t: IncidentFilter) => void; }
const opts: { value: IncidentFilter; label: string; emoji: string }[] = [
  { value: "all", label: "All Types", emoji: "" },
  { value: "cardiac", label: "Cardiac", emoji: "🫀" },
  { value: "fire", label: "Fire", emoji: "🔥" },
  { value: "medical", label: "Medical", emoji: "🏥" },
];

export default function IncidentSelector({ value, onChange }: Props) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Target size={11} className="text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Incident Type</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {opts.map((o) => (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={`px-2 py-1 rounded text-[11px] font-medium border transition-all ${value === o.value ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-white text-slate-500 border-surface-200 hover:border-slate-300"}`}>
            {o.emoji && <span className="mr-1">{o.emoji}</span>}{o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
