"use client";
import { useState } from "react";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";

const STATIONS = ["jurong", "bishan", "tampines", "central"] as const;
type StationId = (typeof STATIONS)[number];

const STATION_LABELS: Record<StationId, string> = {
  jurong: "Jurong Fire Station",
  bishan: "Bishan Fire Station",
  tampines: "Tampines Fire Station",
  central: "Central Fire Station",
};

const MODEL_IMAGES = {
  bestStation: "/model/best_station_per_cell_18h.png",
  cfr: "/model/cfr_density_proxy_18h.png",
  stationCoverage: (id: StationId) => `/model/coverage_${id}_by_hour.png`,
} as const;

export default function ModelCoveragePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStation, setSelectedStation] = useState<StationId>("central");

  return (
    <section className="rounded-2xl border border-surface-200 bg-white/95 shadow-sm">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 p-3"
      >
        <div className="flex items-center gap-2">
          <Brain size={13} className="text-indigo-500" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            ML Coverage Model
          </span>
        </div>
        {isOpen ? (
          <ChevronUp size={14} className="text-slate-400" />
        ) : (
          <ChevronDown size={14} className="text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-4 border-t border-surface-100 p-4">
          <div className="rounded-xl border border-surface-100 bg-surface-50 p-3">
            <div className="mb-2 text-xs font-semibold text-slate-700">
              Best-responding station per cell (18:00)
            </div>
            <div className="relative aspect-[5/4] w-full overflow-hidden rounded-lg">
              <Image
                src={MODEL_IMAGES.bestStation}
                alt="Best station coverage at 18:00"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Each cell is colored by the station with the highest P(reach within 8 min).
              Opacity indicates model confidence.
            </p>
          </div>

          <div className="rounded-xl border border-surface-100 bg-surface-50 p-3">
            <div className="mb-2 text-xs font-semibold text-slate-700">
              Station coverage by time of day
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {STATIONS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedStation(id)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                    selectedStation === id
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 border border-surface-200 hover:bg-surface-50"
                  }`}
                >
                  {STATION_LABELS[id].replace(" Fire Station", "")}
                </button>
              ))}
            </div>
            <div className="relative aspect-[4/1] w-full overflow-hidden rounded-lg">
              <Image
                src={MODEL_IMAGES.stationCoverage(selectedStation)}
                alt={`${STATION_LABELS[selectedStation]} coverage by hour`}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              P(reach within 8 min) across Singapore at 08:00, 13:00, 18:00, 23:00.
              LightGBM classifier trained on OSM road graph + LTA speed bands.
            </p>
          </div>

          <div className="rounded-xl border border-surface-100 bg-surface-50 p-3">
            <div className="mb-2 text-xs font-semibold text-slate-700">
              CFR availability density (proxy, 18:00)
            </div>
            <div className="relative aspect-[9/7] w-full overflow-hidden rounded-lg">
              <Image
                src={MODEL_IMAGES.cfr}
                alt="CFR density proxy at 18:00"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Illustrative CFR density based on CBD-centric spatial decay and
              time-of-day acceptance estimates.
            </p>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
            Model outputs are pre-computed from LightGBM trained on OSM + LTA data.
            These are static snapshots — live inference is a production milestone.
          </div>
        </div>
      )}
    </section>
  );
}
