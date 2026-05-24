"use client";
import { AlertTriangle, Flame, HeartPulse, LocateFixed } from "lucide-react";
import type { Incident } from "@/types";

interface Props {
  incidents: Incident[];
  selectedIncidentId: number | null;
  onSelectIncident: (incident: Incident) => void;
  compact?: boolean;
  maxVisible?: number;
}

export default function IncidentFeed({
  incidents,
  selectedIncidentId,
  onSelectIncident,
  compact = false,
  maxVisible,
}: Props) {
  const visibleIncidents = maxVisible ? incidents.slice(0, maxVisible) : incidents;

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <AlertTriangle size={11} className="text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Incident Feed</span>
        <span className="ml-auto text-[10px] font-mono text-slate-400">{incidents.length}</span>
      </div>

      {maxVisible && incidents.length > maxVisible && (
        <div className="mb-2 text-[10px] text-slate-400">
          Showing {visibleIncidents.length} of {incidents.length} incidents
        </div>
      )}

      <div className="space-y-1.5">
        {visibleIncidents.map((incident) => (
          <button
            key={incident.id}
            type="button"
            onClick={() => onSelectIncident(incident)}
            className={`flex w-full items-center gap-2.5 rounded-xl border text-left transition-colors ${
              selectedIncidentId === incident.id
                ? "border-brand-200 bg-brand-50/60 shadow-sm"
                : "border-surface-100 bg-white hover:border-slate-200 hover:bg-surface-50"
            } ${compact ? "px-2.5 py-2" : "px-3 py-2"}`}
          >
            <div className={`flex shrink-0 items-center justify-center rounded-xl ${incident.type === "fire" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"} ${compact ? "h-7 w-7" : "h-8 w-8"}`}>
              {incident.type === "fire" ? <Flame size={compact ? 13 : 14} /> : <HeartPulse size={compact ? 13 : 14} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-800">{incident.desc}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {incident.severity} severity • {incident.timestamp}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${incident.status === "active" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                {incident.status}
              </span>
              <div className={`rounded-full border p-1 ${selectedIncidentId === incident.id ? "border-brand-200 bg-white text-brand-700" : "border-surface-200 bg-white text-slate-400"}`}>
                <LocateFixed size={12} />
              </div>
            </div>
          </button>
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
