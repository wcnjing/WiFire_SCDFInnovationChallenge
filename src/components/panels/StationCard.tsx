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
  if (!station) return (
    <div className="p-5 text-center text-slate-400">
      <Radio size={20} className="mx-auto mb-2" />
      <p className="text-xs">Click a station on the map to view details</p>
    </div>
  );

  const weatherPenalty = weatherImpact?.penalty ?? 0;
  const adj = getAdjustedResponseTime(station, timeOffset, weatherPenalty);
  const rc = adj <= 8 ? "text-coverage-green" : adj <= 11 ? "text-coverage-amber" : "text-coverage-red";
  const rk = station.risk === "high" ? "text-coverage-red" : station.risk === "medium" ? "text-coverage-amber" : "text-coverage-green";
  const rc2 = station.readiness >= 85 ? "bg-green-50 text-green-600 border-green-200" : station.readiness >= 75 ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-red-50 text-red-600 border-red-200";

  return (
    <motion.div key={station.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}
      className="m-3 p-3.5 bg-surface-50 rounded-xl border border-surface-200">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{station.name}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{station.coverage} Region</p>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${rc2}`}>{station.readiness}%</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 bg-white rounded-lg">
          <div className="text-[10px] text-slate-400">Avg Response</div>
          <div className={`text-base font-bold font-mono ${rc}`}>{adj.toFixed(1)}m</div>
        </div>
        <div className="p-2 bg-white rounded-lg">
          <div className="text-[10px] text-slate-400">Available Units</div>
          <div className="text-base font-bold font-mono text-slate-800">{station.units}</div>
        </div>
        <div className="p-2 bg-white rounded-lg">
          <div className="text-[10px] text-slate-400">Traffic Impact</div>
          <div className={`text-base font-bold font-mono ${rk}`}>{station.risk === "high" ? "High" : station.risk === "medium" ? "Med" : "Low"}</div>
        </div>
        <div className="p-2 bg-white rounded-lg">
          <div className="text-[10px] text-slate-400">Weather Impact</div>
          <div className={`text-base font-bold font-mono ${weatherPenalty >= 1 ? "text-coverage-red" : weatherPenalty >= 0.45 ? "text-coverage-amber" : "text-coverage-green"}`}>
            +{weatherPenalty.toFixed(1)}m
          </div>
        </div>
      </div>
      {weatherImpact && (
        <div className="mt-2.5 p-2 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-[11px] text-blue-700 font-medium">
            {weatherImpact.forecastArea}: {weatherImpact.forecast} · Rainfall {weatherImpact.rainfall.toFixed(1)} mm near {weatherImpact.rainfallStation}
          </p>
          <p className="text-[10px] text-blue-500 mt-1">{weatherImpact.periodLabel}</p>
        </div>
      )}
      {station.risk === "high" && timeOffset >= 15 && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="mt-2.5 p-2 bg-red-50 rounded-lg border border-red-100">
          <p className="text-[11px] text-red-700 font-medium">⚠ Coverage zone predicted to exceed 11-min threshold at +{timeOffset}min. Consider pre-positioning additional units.</p>
        </motion.div>
      )}
    </motion.div>
  );
}
