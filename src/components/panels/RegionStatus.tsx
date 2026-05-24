"use client";
import type { Region, TimeOffset, WeatherRegionImpact } from "@/types";

interface Props {
  regions: Region[];
  timeOffset: TimeOffset;
  weatherImpacts?: WeatherRegionImpact[];
  showHeader?: boolean;
}

const weatherTone = {
  clear: "text-slate-300",
  cloudy: "text-slate-400",
  light: "text-brand-600",
  heavy: "text-coverage-amber",
  storm: "text-coverage-red",
} as const;

function trendLabel(trend: Region["trend"]) {
  if (trend === "degrading") return { glyph: "DOWN", tone: "text-coverage-red" };
  if (trend === "improving") return { glyph: "UP", tone: "text-brand-600" };
  return { glyph: "STABLE", tone: "text-coverage-green" };
}

export default function RegionStatus({ regions, timeOffset, weatherImpacts = [], showHeader = true }: Props) {
  const impactMap = new Map(weatherImpacts.map((impact) => [impact.region, impact]));

  return (
    <div>
      {showHeader && (
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Regional Status</div>
      )}
      <div className="space-y-2">
        {regions.map((region) => {
          const impact = impactMap.get(region.name);
          const health = Math.max(Math.round(region.health - timeOffset * 0.3 - ((impact?.penalty ?? 0) * 6)), 50);
          const barTone = health >= 85 ? "bg-coverage-green" : health >= 75 ? "bg-coverage-amber" : "bg-coverage-red";
          const trend = trendLabel(region.trend);

          return (
            <div key={region.name} className="rounded-xl border border-surface-100 bg-white px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-800">{region.name}</div>
                  <div className="text-[10px] text-slate-400">{region.stations} stations | {region.avgResponse.toFixed(1)}m avg</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-slate-800">{health}%</div>
                  <div className={`text-[10px] font-semibold uppercase tracking-wide ${trend.tone}`}>{trend.glyph}</div>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-100">
                  <div className={`h-full rounded-full transition-all duration-500 ${barTone}`} style={{ width: `${health}%` }} />
                </div>
                <span className={`text-[10px] font-semibold ${impact ? weatherTone[impact.severity] : "text-slate-300"}`}>
                  {impact ? impact.severity.toUpperCase() : "CLEAR"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
