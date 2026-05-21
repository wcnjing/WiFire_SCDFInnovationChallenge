"use client";
import { CloudRain, CloudLightning, ThermometerSun } from "lucide-react";
import type { TimeOffset, WeatherRegionImpact, WeatherSummary } from "@/types";

interface Props {
  summary: WeatherSummary;
  regionImpacts: WeatherRegionImpact[];
  timeOffset: TimeOffset;
}

function severityText(impact: WeatherRegionImpact) {
  if (impact.severity === "storm") return "Storm";
  if (impact.severity === "heavy") return "Heavy rain";
  if (impact.severity === "light") return "Light rain";
  if (impact.severity === "cloudy") return "Cloudy";
  return "Clear";
}

export default function WeatherOutlook({ summary, regionImpacts, timeOffset }: Props) {
  const topRegions = regionImpacts.slice(0, 3);

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <CloudRain size={11} className="text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Weather Outlook</span>
        {summary.updatedLabel && <span className="ml-auto text-[10px] font-mono text-slate-300">{summary.updatedLabel}</span>}
      </div>

      <div className="space-y-2">
        <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-100">
          <div className="text-[10px] text-slate-400 mb-1">Live Rainfall</div>
          <div className="text-xs font-semibold text-slate-800">
            {summary.peakRainStation ? `${summary.peakRainfall.toFixed(1)} mm at ${summary.peakRainStation}` : "No active rainfall hotspot"}
          </div>
        </div>

        <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-100">
          <div className="flex items-center gap-1.5 mb-1">
            <CloudLightning size={12} className="text-amber-500" />
            <div className="text-[10px] text-slate-400">{timeOffset === 0 ? "Current operational risk" : `Next +${timeOffset}m operational risk`}</div>
          </div>
          <div className="text-xs font-semibold text-slate-800">
            {summary.topRegion ? `${summary.topRegion} · ${summary.topRegionForecast}` : "Awaiting forecast classification"}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary.twoHourWindow ?? "2-hour weather window unavailable"} · +{summary.topRegionPenalty.toFixed(1)} min est.
          </div>
        </div>

        <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-100">
          <div className="flex items-center gap-1.5 mb-1">
            <ThermometerSun size={12} className="text-red-400" />
            <div className="text-[10px] text-slate-400">24-hour outlook</div>
          </div>
          <div className="text-xs font-semibold text-slate-800">{summary.twentyFourGeneralForecast ?? "No 24-hour outlook available"}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {summary.twentyFourPeriodLabel ?? "Forecast window unavailable"}{summary.temperatureRange ? ` · ${summary.temperatureRange}` : ""}
          </div>
        </div>

        <div className="space-y-1">
          {topRegions.map((impact) => (
            <div key={impact.region} className="flex items-center justify-between text-[11px] py-1">
              <div className="min-w-0">
                <div className="font-medium text-slate-700 truncate">{impact.region}</div>
                <div className="text-slate-400 truncate">{severityText(impact)} · {impact.rainfall.toFixed(1)} mm</div>
              </div>
              <div className="text-right ml-3 shrink-0">
                <div className="font-mono text-slate-700">+{impact.penalty.toFixed(1)}m</div>
                <div className="text-slate-300 uppercase tracking-wide">{impact.severity}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
