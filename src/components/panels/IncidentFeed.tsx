"use client";
import { AlertTriangle, Flame, HeartPulse } from "lucide-react";
import type { Incident } from "@/types";

export default function IncidentFeed({ incidents }: { incidents: Incident[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <AlertTriangle size={11} className="text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Incident Feed</span>
        <span className="ml-auto text-[10px] font-mono text-slate-400">{incidents.length}</span>
      </div>

      <div className="space-y-1.5">
        {incidents.map((incident) => (
          <div key={incident.id} className="flex items-center gap-2.5 rounded-xl border border-surface-100 bg-white px-3 py-2">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${incident.type === "fire" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
              {incident.type === "fire" ? <Flame size={14} /> : <HeartPulse size={14} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-800">{incident.desc}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{incident.severity} severity - {incident.timestamp}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${incident.status === "active" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
              {incident.status}
            </span>
          </div>
        ))}

        {incidents.length === 0 && (
          <div className="rounded-xl border border-surface-100 bg-surface-50 px-3 py-2 text-[11px] text-slate-500">
            No active incidents in the current filter window.
          </div>
        )}
      </div>
    </div>
  );
}
