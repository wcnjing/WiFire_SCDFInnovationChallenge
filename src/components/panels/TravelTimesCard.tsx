"use client";
import { AlertTriangle, Clock3, Route } from "lucide-react";
import type { LTATravelTime } from "@/hooks/useLTAData";
import type { SourceStatus } from "@/types";

interface Props {
  travelTimes: LTATravelTime[];
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
  sourceStatus: SourceStatus;
}

interface TravelSegment extends LTATravelTime {
  minutes: number;
}

const sourceTone = {
  live: "border-emerald-200 bg-emerald-50 text-emerald-700",
  loading: "border-amber-200 bg-amber-50 text-amber-700",
  mock: "border-violet-200 bg-violet-50 text-violet-700",
  error: "border-red-200 bg-red-50 text-red-700",
  stale: "border-slate-200 bg-slate-100 text-slate-700",
} as const;

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

function sourceLabel(status: SourceStatus) {
  if (status.mode === "mock") return "Using simulated traffic feed";
  if (status.mode === "loading") return "Loading live LTA data";
  if (status.mode === "stale") return "Using last live traffic snapshot";
  if (status.mode === "error") return "Traffic feed unavailable";
  return "LTA Live";
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

export default function TravelTimesCard({ travelTimes, loading, error, fetchedAt, sourceStatus }: Props) {
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
      <div className="flex items-center gap-1.5 mb-2">
        <Route size={11} className="text-slate-400" />
        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">LTA Corridor ETA</span>
        {updatedLabel && <span className="ml-auto text-[10px] font-mono text-slate-300">{updatedLabel}</span>}
      </div>

      <div className={`mb-2 flex items-center justify-between rounded-xl border px-3 py-2 text-[11px] ${sourceTone[sourceStatus.mode]}`}>
        <span className="font-semibold uppercase tracking-wide">{sourceLabel(sourceStatus)}</span>
        {sourceStatus.updatedLabel && <span className="font-mono">{sourceStatus.updatedLabel}</span>}
      </div>

      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5">
            <div className="text-[10px] text-slate-400">Monitored corridors</div>
            <div className="text-sm font-bold text-slate-800">{expresswayCount || "--"}</div>
          </div>
          <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5">
            <div className="text-[10px] text-slate-400">Avg segment ETA</div>
            <div className="text-sm font-bold text-slate-800">{averageMinutes === null ? "--" : `${averageMinutes.toFixed(1)}m`}</div>
          </div>
        </div>

        {slowestSegment && (
          <div className="rounded-xl border border-surface-100 bg-white p-2.5">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] text-slate-400">
              <Clock3 size={11} className="text-slate-400" />
              Slowest monitored segment
            </div>
            <div className="text-xs font-semibold text-slate-800">
              {slowestSegment.Name}: {slowestSegment.StartPoint} to {slowestSegment.EndPoint}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Towards {slowestSegment.FarEndPoint} - {slowestSegment.minutes} min
            </div>
          </div>
        )}

        {!segments.length && loading && (
          <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5 text-[11px] text-slate-500">
            Loading live expressway travel times...
          </div>
        )}

        {!segments.length && !loading && error && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-2.5 text-[11px] text-red-600">
            Travel time feed unavailable. {error}
          </div>
        )}

        {!segments.length && !loading && !error && (
          <div className="rounded-xl border border-surface-100 bg-surface-50 p-2.5 text-[11px] text-slate-500">
            No expressway travel time segments returned by LTA.
          </div>
        )}

        {topSegments.length > 0 && (
          <div className="space-y-1.5">
            {topSegments.map((segment, index) => (
              <div
                key={`${segment.Name}-${segment.StartPoint}-${segment.EndPoint}-${index}`}
                className="flex items-start gap-2.5 rounded-xl border border-surface-100 bg-white px-3 py-2"
              >
                <div className={`mt-0.5 rounded-md border px-2 py-1 text-[10px] font-semibold ${severityTone(segment.minutes)}`}>
                  {segment.minutes}m
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-slate-800">{segment.Name}</div>
                  <div className="truncate text-[11px] text-slate-500">{segment.StartPoint} to {segment.EndPoint}</div>
                  <div className="mt-0.5 truncate text-[10px] text-slate-400">Towards {segment.FarEndPoint}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {sourceStatus.mode === "mock" && (
          <div className="flex items-start gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-[11px] text-violet-700">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            Traffic overlay has fallen back to simulated expressway conditions so the demo can continue.
          </div>
        )}
      </div>
    </div>
  );
}
