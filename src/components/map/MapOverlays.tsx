"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Brain, Camera, MapPinned, X, Zap } from "lucide-react";
import type { TimeOffset, ViewMode } from "@/types";
import { AI_CONFIDENCE, AI_PREDICTIONS } from "@/data/mock";
import { useLiveTick } from "@/hooks/useLiveTick";
import type { RankedTrafficCameraSnapshot } from "@/lib/trafficCameras";

export function AIBanner({ timeOffset, onClose }: { timeOffset: TimeOffset; onClose?: () => void }) {
  const tick = useLiveTick(5000);
  const confidence = AI_CONFIDENCE[timeOffset] ?? 90;
  const elapsed = tick % 3;

  return (
    <motion.div
      key={timeOffset}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-surface-200 rounded-xl p-3 max-w-md shadow-md"
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded tracking-wide">PROTOTYPE FORECAST</span>
        <Brain size={13} className="text-violet-400" />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-full p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
            aria-label="Hide AI prediction"
          >
            <X size={12} />
          </button>
        )}
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{AI_PREDICTIONS[timeOffset]}</p>
      <p className="text-[10px] text-slate-400 mt-1.5">
        Forecast confidence: {confidence}% | Updated {elapsed === 0 ? "just now" : `${elapsed * 15}s ago`}
      </p>
    </motion.div>
  );
}

export function MapLegend({ activeView, onClose }: { activeView: ViewMode; onClose?: () => void }) {
  const items = [
    { color: "#22c55e", label: "Green: Within fire response target" },
    { color: "#f59e0b", label: "Amber: Within EMS response target" },
    { color: "#ef4444", label: "Red: Delayed / degraded coverage" },
    { color: "#94a3b8", label: "Grey: Unavailable" },
    ...(activeView === "response" ? [{ color: "#8b5cf6", label: "Volunteer density" }] : []),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-white border border-surface-200 rounded-lg px-3 py-2.5 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
          {activeView === "coverage" ? "Coverage Zones" : "Response Capacity"}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-full p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
            aria-label="Hide coverage legend"
          >
            <X size={12} />
          </button>
        )}
      </div>
      {items.map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2 py-0.5">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[11px] text-slate-500">{label}</span>
        </div>
      ))}
    </motion.div>
  );
}

export function FloatingAlert({ visible, message }: { visible: boolean; message: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.35 }}
          className="bg-white border border-surface-200 rounded-xl px-3.5 py-2.5 shadow-lg max-w-[280px]"
        >
        <div className="flex items-center gap-1 text-[11px] font-bold text-violet-600 mb-1">
          <Zap size={12} />
          FORECAST ALERT
        </div>
          <p className="text-xs text-slate-600 leading-relaxed">{message}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function TrafficCameraPreview({
  camera,
  onClose,
}: {
  camera: RankedTrafficCameraSnapshot;
  onClose: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <motion.div
      key={camera.cameraId}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="w-full max-w-sm rounded-2xl border border-surface-200 bg-white p-3 shadow-xl"
    >
      <div className="mb-2 flex items-center gap-2">
        <Camera size={14} className="text-slate-400" />
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Traffic Camera Snapshot
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-full p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
          aria-label="Hide traffic camera snapshot"
        >
          <X size={12} />
        </button>
      </div>

      <div className="rounded-2xl border border-surface-100 bg-surface-50 p-2">
        {!imageFailed ? (
          <img
            src={camera.imageLink}
            alt={`Traffic camera snapshot ${camera.cameraId}`}
            className="h-52 w-full rounded-xl object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex h-52 items-center justify-center rounded-xl bg-white px-4 text-center text-[11px] text-slate-500">
            Snapshot link expired. Refresh the traffic camera feed to load a fresh image.
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="text-sm font-semibold text-slate-900">Camera {camera.cameraId}</div>
        <div className="inline-flex items-center gap-1 rounded-full border border-surface-200 bg-surface-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
          <MapPinned size={10} className="text-slate-400" />
          {camera.focusLabel}
        </div>
        <div className="text-[11px] text-slate-600">
          Approx. {camera.distanceKm.toFixed(1)} km from the monitored corridor
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          {camera.latitude.toFixed(5)}, {camera.longitude.toFixed(5)}
        </div>
        <div className="text-[10px] font-medium text-slate-500">
          Snapshot from LTA DataMall for congestion context and response analysis.
        </div>
      </div>
    </motion.div>
  );
}
