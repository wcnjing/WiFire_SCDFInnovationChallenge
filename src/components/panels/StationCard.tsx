"use client";
import { motion } from "framer-motion";
import { Radio } from "lucide-react";
import type { FireStation, TimeOffset, WeatherStationImpact } from "@/types";
import { getAdjustedResponseTime } from "@/lib/coverage";

interface Props {
  station: FireStation | null;
  timeOffset: TimeOffset;
  weatherImpact?: WeatherStationImpact | null;
}

export default function StationCard({ station, timeOffset, weatherImpact }: Props) {
  if (!station) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-300 bg-white px-4 py-5 text-center text-slate-400">
        <Radio size={20} className="mx-auto mb-2" />
        <p className="text-xs">Select a station on the map to inspect readiness, weather impact, and dispatch posture.</p>
      </div>
    );
  }

  const weatherPenalty = weatherImpact?.penalty ?? 0;
  const adjustedResponse = getAdjustedResponseTime(station, timeOffset, weatherPenalty);
  const responseTone = adjustedResponse <= 8 ? "text-coverage-green" : adjustedResponse <= 11 ? "text-coverage-amber" : "text-coverage-red";
  const riskTone = station.risk === "high" ? "text-coverage-red" : station.risk === "medium" ? "text-coverage-amber" : "text-coverage-green";
  const readinessTone = station.readiness >= 85
    ? "bg-green-50 text-green-700 border-green-200"
    : station.readiness >= 75
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-red-50 text-red-700 border-red-200";

  return (
    <motion.div
      key={station.id}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-brand-200 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,1))] p-4 shadow-[0_12px_30px_rgba(30,64,175,0.08)] ring-1 ring-brand-100"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="rounded-full border border-brand-200 bg-white/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
            Selected station
          </div>
          <h3 className="mt-2 text-sm font-bold text-slate-900">{station.name}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500">{station.coverage} Region</p>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${readinessTone}`}>{station.readiness}% ready</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/80 bg-white/85 p-2.5">
          <div className="text-[10px] text-slate-400">Avg Response</div>
          <div className={`text-base font-bold font-mono ${responseTone}`}>{adjustedResponse.toFixed(1)}m</div>
        </div>
        <div className="rounded-xl border border-white/80 bg-white/85 p-2.5">
          <div className="text-[10px] text-slate-400">Available Units</div>
          <div className="text-base font-bold font-mono text-slate-800">{station.units}</div>
        </div>
        <div className="rounded-xl border border-white/80 bg-white/85 p-2.5">
          <div className="text-[10px] text-slate-400">Traffic Exposure</div>
          <div className={`text-base font-bold font-mono ${riskTone}`}>{station.risk}</div>
        </div>
        <div className="rounded-xl border border-white/80 bg-white/85 p-2.5">
          <div className="text-[10px] text-slate-400">Weather Penalty</div>
          <div className={`text-base font-bold font-mono ${weatherPenalty >= 1 ? "text-coverage-red" : weatherPenalty >= 0.45 ? "text-coverage-amber" : "text-coverage-green"}`}>
            +{weatherPenalty.toFixed(1)}m
          </div>
        </div>
      </div>

      {weatherImpact && (
        <div className="mt-2.5 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
          <p className="text-[11px] font-medium text-blue-800">
            {weatherImpact.forecastArea}: {weatherImpact.forecast} - rainfall {weatherImpact.rainfall.toFixed(1)} mm near {weatherImpact.rainfallStation}
          </p>
          <p className="mt-1 text-[10px] text-blue-600">{weatherImpact.periodLabel}</p>
        </div>
      )}

      {station.risk === "high" && timeOffset >= 15 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-2.5 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5"
        >
          <p className="text-[11px] font-medium text-red-700">
            Coverage is forecast to exceed the 11-minute threshold at +{timeOffset}m. Consider pre-positioning additional units.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
