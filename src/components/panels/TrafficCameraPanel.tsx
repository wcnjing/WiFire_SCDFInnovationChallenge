"use client";
import { useMemo, useState } from "react";
import { Camera, LoaderCircle, MapPinned, RefreshCw } from "lucide-react";
import type { FireStation, Incident, TrafficCameraSnapshot } from "@/types";
import { buildTrafficCameraFocusPoints, rankTrafficCameraSnapshots, type RankedTrafficCameraSnapshot } from "@/lib/trafficCameras";

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

const UNAVAILABLE_MESSAGE = "Traffic camera snapshots unavailable. Add LTA_ACCOUNT_KEY to .env.local to enable this feature.";

function formatUpdatedLabel(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function SnapshotTile({ camera }: { camera: RankedTrafficCameraSnapshot }) {
  const [imageFailed, setImageFailed] = useState(false);
  const badgeTone = camera.tone === "station"
    ? "border-brand-200 bg-brand-50 text-brand-700"
    : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <article className="overflow-hidden rounded-2xl border border-surface-100 bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-surface-100">
        {!imageFailed ? (
          <img
            src={camera.imageLink}
            alt={`Traffic camera snapshot ${camera.cameraId}`}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-[11px] text-slate-500">
            Snapshot link expired. Refresh to load a new traffic camera snapshot.
          </div>
        )}
      </div>
      <div className="space-y-1.5 px-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs font-semibold text-slate-900">Camera {camera.cameraId}</div>
          <div className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeTone}`}>
            {camera.distanceKm.toFixed(1)} km
          </div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-surface-200 bg-surface-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          <MapPinned size={10} className="text-slate-400" />
          {camera.focusLabel}
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          {camera.latitude.toFixed(5)}, {camera.longitude.toFixed(5)}
        </div>
        <div className="text-[10px] font-medium text-slate-500">Snapshot from LTA DataMall</div>
      </div>
    </article>
  );
}

export default function TrafficCameraPanel({
  selectedStation,
  incidents,
  selectedIncidentId,
  cameras,
  loading,
  error,
  lastUpdated,
  onRefresh,
}: Props) {
  const focusPoints = useMemo(
    () => buildTrafficCameraFocusPoints(selectedStation, incidents, selectedIncidentId),
    [incidents, selectedIncidentId, selectedStation],
  );
  const visibleCameras = useMemo(
    () => rankTrafficCameraSnapshots(cameras, focusPoints),
    [cameras, focusPoints],
  );
  const updatedLabel = formatUpdatedLabel(lastUpdated);

  return (
    <section className="rounded-2xl border border-surface-200 bg-white/95 p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Camera size={13} className="text-slate-400" />
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Traffic Camera Evidence
        </div>
        {updatedLabel && <div className="ml-auto text-[10px] font-mono text-slate-400">{updatedLabel}</div>}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-surface-100 bg-surface-50 px-3 py-2">
        <p className="text-[11px] leading-relaxed text-slate-600">
          Snapshots provide visual context for congestion and response corridor analysis near selected stations and live incident areas.
        </p>
        <button
          type="button"
          onClick={() => void onRefresh()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-surface-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-surface-50 hover:text-slate-800"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {focusPoints.length > 0 && (
        <div className="mt-3 rounded-xl border border-surface-100 bg-white px-3 py-2 text-[11px] text-slate-600">
          Prioritising cameras nearest to {focusPoints[0].label.toLowerCase()}
          {focusPoints.length > 1 ? " and active incident corridors." : "."}
        </div>
      )}

      {loading && visibleCameras.length === 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-surface-100 bg-surface-50 px-3 py-3 text-[11px] text-slate-500">
          <LoaderCircle size={13} className="animate-spin text-slate-400" />
          Loading traffic camera snapshots...
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-[11px] leading-relaxed text-amber-800">
          <div>{UNAVAILABLE_MESSAGE}</div>
          {visibleCameras.length > 0 && (
            <div className="mt-1 text-amber-700">Showing the most recent successfully loaded snapshots.</div>
          )}
        </div>
      )}

      {!loading && !error && visibleCameras.length === 0 && (
        <div className="mt-3 rounded-xl border border-surface-100 bg-surface-50 px-3 py-3 text-[11px] text-slate-500">
          No traffic camera snapshots are available right now.
        </div>
      )}

      {visibleCameras.length > 0 && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {visibleCameras.map((camera) => (
            <SnapshotTile key={camera.cameraId} camera={camera} />
          ))}
        </div>
      )}
    </section>
  );
}
