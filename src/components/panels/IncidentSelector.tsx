"use client";
import { Target } from "lucide-react";
import type { IncidentFilter } from "@/types";

interface Props {
  value: IncidentFilter;
  onChange: (type: IncidentFilter) => void;
}

const options: { value: IncidentFilter; label: string }[] = [
  { value: "all", label: "All Calls" },
  { value: "cardiac", label: "Cardiac" },
  { value: "fire", label: "Fire" },
  { value: "medical", label: "Medical" },
];

export default function IncidentSelector({ value, onChange }: Props) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <Target size={11} className="text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Incident Filter</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              value === option.value
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-surface-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
