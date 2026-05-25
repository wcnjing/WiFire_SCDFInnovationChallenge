"use client";
import { Route } from "lucide-react";
import { RESPONSE_CORRIDOR_DEMO } from "@/data/mock";
import type { FireStation, Incident, TrafficCameraSnapshot } from "@/types";

interface Props {
  selectedStation: FireStation | null;
  incidents: Incident[];
  selectedIncidentId: number | null;
  cameras: TrafficCameraSnapshot[];
  loading: boolean;
  error: string | null;
  lastUpdated: string | null;
  onRefresh: () => void | Promise<void>;
}

const corridorTone = {
  Low: {
    bar: "bg-green-500",
    badge: "bg-green-50 text-green-700 border-green-200",
    track: "bg-green-100",
    width: "35%",
  },
  Medium: {
    bar: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    track: "bg-amber-100",
    width: "62%",
  },
  High: {
    bar: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    track: "bg-red-100",
    width: "88%",
  },
} as const;

export default function ResponseCorridor3D({ selectedStation, incidents, selectedIncidentId }: Props) {
  return (
    <section className="rounded-2xl border border-surface-200 bg-white/95 p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Route size={13} className="text-slate-400" />
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Response Corridors
        </div>
      </div>

      <div className="mt-3 space-y-3 rounded-2xl border border-surface-100 bg-[linear-gradient(180deg,rgba(248,250,252,1),rgba(239,246,255,0.92))] p-4">
        {RESPONSE_CORRIDOR_DEMO.map((corridor) => {
          const tone = corridorTone[corridor.congestion];

          return (
            <div key={corridor.roadName} className="rounded-xl border border-white/80 bg-white/85 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">{corridor.roadName}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">Estimated delay +{corridor.delayMinutes.toFixed(1)} min</div>
                </div>
                <div className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone.badge}`}>
                  {corridor.congestion}
                </div>
              </div>

              <div className={`mt-3 h-2.5 overflow-hidden rounded-full ${tone.track}`}>
                <div className={`h-full rounded-full ${tone.bar}`} style={{ width: tone.width }} />
              </div>
            </div>
          );
        })}

        <div className="rounded-xl border border-surface-100 bg-white/80 px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
          Road corridor severity indicates segments contributing to response-time degradation.
        </div>
      </div>
    </section>
  );
}
