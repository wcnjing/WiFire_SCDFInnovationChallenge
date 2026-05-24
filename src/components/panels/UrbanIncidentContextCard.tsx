"use client";
import { useState } from "react";
import { Building2, MapPinned } from "lucide-react";
import UrbanIncident3D from "@/components/map/UrbanIncident3D";
import type { Incident } from "@/types";

interface Props {
  incident: Incident | null;
}

interface ContextSummary {
  buildingCount: number;
  isFallback: boolean;
  source: string;
  loading: boolean;
  error: string | null;
}

export default function UrbanIncidentContextCard({ incident }: Props) {
  const [summary, setSummary] = useState<ContextSummary>({
    buildingCount: 0,
    isFallback: true,
    source: "URA via data.gov.sg",
    loading: false,
    error: null,
  });

  return (
    <section className="rounded-2xl border border-surface-200 bg-white/95 p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Building2 size={13} className="text-slate-400" />
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          3D Urban Incident Context
        </div>
        <div className={`ml-auto rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
          summary.isFallback
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-cyan-200 bg-cyan-50 text-cyan-700"
        }`}>
          {summary.isFallback ? "Fallback demo data" : "data.gov.sg"}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-surface-100 bg-surface-50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Selected incident</div>
          <div className="mt-1 text-[11px] font-semibold text-slate-800">
            {incident?.desc ?? "No incident selected"}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
            <MapPinned size={10} className="text-slate-400" />
            {incident ? `${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)}` : "--"}
          </div>
        </div>
        <div className="rounded-xl border border-surface-100 bg-surface-50 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-400">Nearby building context</div>
          <div className="mt-1 text-[11px] font-semibold text-slate-800">
            {summary.loading ? "Loading..." : `${summary.buildingCount} blocks`}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">
            {summary.isFallback ? "Indicative urban context" : summary.source}
          </div>
        </div>
      </div>

      <div className="mt-3">
        <UrbanIncident3D
          incidentLatitude={incident?.lat ?? null}
          incidentLongitude={incident?.lng ?? null}
          onContextChange={setSummary}
        />
      </div>

      <div className="mt-3 rounded-xl border border-surface-100 bg-surface-50 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
        Urban context helps commanders understand whether an incident sits within a dense, high-rise, industrial, or complex-access area. This supports response risk assessment alongside traffic-based response time.
      </div>
    </section>
  );
}
