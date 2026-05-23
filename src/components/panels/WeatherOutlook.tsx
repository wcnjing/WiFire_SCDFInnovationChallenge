"use client";
import { CloudLightning, CloudRain, ThermometerSun } from "lucide-react";
import type { SourceStatus, TimeOffset, WeatherRegionImpact, WeatherSummary } from "@/types";

interface Props {
  summary: WeatherSummary;
  regionImpacts: WeatherRegionImpact[];
  timeOffset: TimeOffset;
  sourceStatus: SourceStatus;
}

const sourceTone = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  loading: "border-amber-200 bg-amber-50 text-amber-700",
  mock: "border-violet-200 bg-violet-50 text-violet-700",
  error: "border-red-200 bg-red-50 text-red-700",
  stale: "border-slate-200 bg-slate-100 text-slate-700",
} as const;

function severityText(impact: WeatherRegionImpact) {
  if (impact.severity === "storm") return "Storm";
  if (impact.severity === "heavy") return "Heavy rain";
  if (impact.severity === "light") return "Light rain";
  if (impact.severity === "cloudy") return "Cloudy";
  return "Clear";
}

function sourceLabel(status: SourceStatus) {
  if (status.mode === "mock") return "Simulated fallback";
  if (status.mode === "loading") return "Loading live data";
  if (status.mode === "stale") return "Last live snapshot";
  if (status.mode === "error") return "Feed unavailable";
  return "Live";
}

export default function WeatherOutlook({ summary, regionImpacts, timeOffset, sourceStatus }: Props) {
  const topRegions = regionImpacts.slice(0, 3);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <CloudRain size={11} className="text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Weather Outlook</span>
        {summary.updatedLabel && <span className="ml-auto text-[10px] font-mono text-slate-300">{summary.updatedLabel}</span>}
      </div>

      <div className={`mb-2 flex items-center justify-between rounded-xl border px-3 py-2 text-[11px] ${sourceTone[sourceStatus.mode]}`}>
        <span className="font-semibold uppercase tracking-wide">NEA {sourceLabel(sourceStatus)}</span>
        {sourceStatus.updatedLabel && <span className="font-mono">{sourceStatus.updatedLabel}</span>}
      </div>

      {sourceStatus.mode === "loading" && topRegions.length === 0 && (
        <div className="mb-2 rounded-xl border border-surface-200 bg-surface-50 px-3 py-2 text-[11px] text-slate-500">
          Loading live NEA weather data...
        </div>
      )}

      <div className="space-y-2">
        <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5">
          <div className="text-[10px] text-slate-400 mb-1">Live Rainfall</div>
          <div className="text-xs font-semibold text-slate-800">
            {summary.peakRainStation ? `${summary.peakRainfall.toFixed(1)} mm at ${summary.peakRainStation}` : "No active rainfall hotspot"}
          </div>
        </div>

        <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <CloudLightning size={12} className="text-amber-500" />
            <div className="text-[10px] text-slate-400">{timeOffset === 0 ? "Current operational risk" : `Next +${timeOffset}m operational risk`}</div>
          </div>
          <div className="text-xs font-semibold text-slate-800">
            {summary.topRegion ? `${summary.topRegion} - ${summary.topRegionForecast}` : "Awaiting forecast classification"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary.twoHourWindow ?? "2-hour weather window unavailable"} - +{summary.topRegionPenalty.toFixed(1)} min est.
          </div>
        </div>

        <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <ThermometerSun size={12} className="text-red-400" />
            <div className="text-[10px] text-slate-400">24-hour outlook</div>
          </div>
          <div className="text-xs font-semibold text-slate-800">{summary.twentyFourGeneralForecast ?? "No 24-hour outlook available"}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary.twentyFourPeriodLabel ?? "Forecast window unavailable"}{summary.temperatureRange ? ` - ${summary.temperatureRange}` : ""}
          </div>
        </div>

        <div className="space-y-1">
          {topRegions.map((impact) => (
            <div key={impact.region} className="flex items-center justify-between py-1 text-[11px]">
              <div className="min-w-0">
                <div className="font-medium text-slate-700 truncate">{impact.region}</div>
                <div className="text-slate-400 truncate">{severityText(impact)} - {impact.rainfall.toFixed(1)} mm</div>
              </div>
              <div className="ml-3 shrink-0 text-right">
                <div className="font-mono text-slate-700">+{impact.penalty.toFixed(1)}m</div>
                <div className="uppercase tracking-wide text-slate-300">{impact.severity}</div>
              </div>
            </div>
          ))}

          {topRegions.length === 0 && (
            <div className="rounded-xl border border-surface-200 bg-white px-3 py-2 text-[11px] text-slate-500">
              Weather outlook unavailable. {sourceStatus.mode === "mock" ? "Using simulated islandwide conditions." : "Awaiting the next forecast snapshot."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
