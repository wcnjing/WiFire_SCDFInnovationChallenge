"use client";
import { Clock3, Route } from "lucide-react";
import type { LTATravelTime } from "@/hooks/useLTAData";

interface Props {
  travelTimes: LTATravelTime[];
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
}

interface TravelSegment extends LTATravelTime {
  minutes: number;
}

function parseMinutes(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatUpdatedLabel(timestamp: number | null) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function severityTone(minutes: number) {
  if (minutes >= 12) return "text-red-600 bg-red-50 border-red-100";
  if (minutes >= 7) return "text-amber-700 bg-amber-50 border-amber-100";
  return "text-green-700 bg-green-50 border-green-100";
}

function buildSegments(travelTimes: LTATravelTime[]) {
  return travelTimes
    .map((segment) => {
      const minutes = parseMinutes(segment.EstTime);
      return minutes === null ? null : { ...segment, minutes };
    })
    .filter((segment): segment is TravelSegment => segment !== null);
}

export default function TravelTimesCard({ travelTimes, loading, error, fetchedAt }: Props) {
  const segments = buildSegments(travelTimes);
  const topSegments = [...segments].sort((a, b) => b.minutes - a.minutes).slice(0, 5);
  const updatedLabel = formatUpdatedLabel(fetchedAt);
  const expresswayCount = new Set(segments.map((segment) => segment.Name)).size;
  const averageMinutes = segments.length > 0
    ? segments.reduce((sum, segment) => sum + segment.minutes, 0) / segments.length
    : null;
  const slowestSegment = topSegments[0] ?? null;

  return (
    <div>
      <div className="px-3 py-2 border-b border-surface-100">
        <div className="flex items-center gap-1.5">
          <Route size={11} className="text-slate-400" />
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Expressway ETA</span>
          {updatedLabel && <span className="ml-auto text-[10px] font-mono text-slate-400">{updatedLabel}</span>}
        </div>
      </div>

      <div className="p-3 space-y-2.5 border-b border-surface-50">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-100">
            <div className="text-[10px] text-slate-400">Monitored corridors</div>
            <div className="text-sm font-bold text-slate-800">{expresswayCount || "--"}</div>
          </div>
          <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-100">
            <div className="text-[10px] text-slate-400">Avg segment ETA</div>
            <div className="text-sm font-bold text-slate-800">{averageMinutes === null ? "--" : `${averageMinutes.toFixed(1)}m`}</div>
          </div>
        </div>

        {slowestSegment && (
          <div className="p-2.5 rounded-lg border border-surface-100 bg-white">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
              <Clock3 size={11} className="text-slate-400" />
              Slowest live segment
            </div>
            <div className="text-xs font-semibold text-slate-800">
              {slowestSegment.Name}: {slowestSegment.StartPoint} to {slowestSegment.EndPoint}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Towards {slowestSegment.FarEndPoint} - {slowestSegment.minutes} min
            </div>
          </div>
        )}

        {!segments.length && loading && (
          <div className="p-2.5 rounded-lg border border-surface-100 bg-surface-50 text-[11px] text-slate-500">
            Loading live expressway travel times...
          </div>
        )}

        {!segments.length && !loading && error && (
          <div className="p-2.5 rounded-lg border border-red-100 bg-red-50 text-[11px] text-red-600">
            Travel time feed unavailable. {error}
          </div>
        )}

        {!segments.length && !loading && !error && (
          <div className="p-2.5 rounded-lg border border-surface-100 bg-surface-50 text-[11px] text-slate-500">
            No expressway travel time segments returned by LTA.
          </div>
        )}
      </div>

      {topSegments.length > 0 && (
        <div>
          {topSegments.map((segment, index) => (
            <div key={`${segment.Name}-${segment.StartPoint}-${segment.EndPoint}-${index}`} className="px-3 py-2 border-b border-surface-50 flex items-start gap-2.5">
              <div className={`mt-0.5 px-2 py-1 rounded-md border text-[10px] font-semibold ${severityTone(segment.minutes)}`}>
                {segment.minutes}m
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-800 truncate">{segment.Name}</div>
                <div className="text-[11px] text-slate-500 truncate">{segment.StartPoint} to {segment.EndPoint}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">Towards {segment.FarEndPoint}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
