"use client";
import type { Region, TimeOffset, WeatherRegionImpact } from "@/types";

interface Props {
  regions: Region[];
  timeOffset: TimeOffset;
  weatherImpacts?: WeatherRegionImpact[];
}

const weatherTone = {
  clear: "text-slate-300",
  cloudy: "text-slate-400",
  light: "text-brand-600",
  heavy: "text-coverage-amber",
  storm: "text-coverage-red",
} as const;

export default function RegionStatus({ regions, timeOffset, weatherImpacts = [] }: Props) {
  const impactMap = new Map(weatherImpacts.map((impact) => [impact.region, impact]));
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Regional Status</div>
      <div className="space-y-1">
        {regions.map((r) => {
          const impact = impactMap.get(r.name);
          const h = Math.max(Math.round(r.health - timeOffset * 0.3 - ((impact?.penalty ?? 0) * 6)), 50);
          const bar = h >= 85 ? "bg-coverage-green" : h >= 75 ? "bg-coverage-amber" : "bg-coverage-red";
          const ti = r.trend === "stable" ? "●" : r.trend === "degrading" ? "▼" : "▲";
          const tc = r.trend === "stable" ? "text-coverage-green" : r.trend === "degrading" ? "text-coverage-red" : "text-brand-600";
          return (
            <div key={r.name} className="flex items-center justify-between py-1">
              <span className="text-xs font-medium text-slate-700 w-20 truncate">{r.name}</span>
              <div className="w-12 h-1 bg-surface-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${h}%` }} />
              </div>
              <span className="text-[10px] font-mono text-slate-400 w-8 text-right">{h}%</span>
              <span className={`text-[10px] font-semibold w-5 text-center ${impact ? weatherTone[impact.severity] : "text-slate-200"}`}>
                {impact ? "☁" : "·"}
              </span>
              <span className={`text-[10px] font-semibold ${tc}`}>{ti}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
