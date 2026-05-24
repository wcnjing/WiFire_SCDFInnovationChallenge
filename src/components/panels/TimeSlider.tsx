"use client";
import { Clock } from "lucide-react";
import type { TimeOffset } from "@/types";

interface Props { value: TimeOffset; onChange: (o: TimeOffset) => void; }
const opts: { value: TimeOffset; label: string }[] = [
  { value: 0, label: "Now" }, { value: 15, label: "+15m" },
  { value: 30, label: "+30m" }, { value: 60, label: "+60m" },
];

export default function TimeSlider({ value, onChange }: Props) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Clock size={11} className="text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Prediction Window</span>
      </div>
      <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
        Operational forecast horizon for the next 0 to 60 minutes.
      </p>
      <div className="flex gap-1">
        {opts.map((o) => (
          <button key={o.value} onClick={() => onChange(o.value)}
            className={`flex-1 px-2 py-1.5 rounded text-[11px] font-mono font-medium border transition-all duration-150 ${value === o.value ? "bg-brand-800 text-white border-brand-800" : "bg-white text-slate-500 border-surface-200 hover:border-slate-300"}`}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
