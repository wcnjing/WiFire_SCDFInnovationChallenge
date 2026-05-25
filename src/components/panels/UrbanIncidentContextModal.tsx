"use client";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Incident, UrbanBuildingContext, UrbanBuildingSelectionOptions } from "@/types";
import UrbanIncidentContextCard from "@/components/panels/UrbanIncidentContextCard";

interface Props {
  isOpen: boolean;
  incident: Incident | null;
  buildings: UrbanBuildingContext[];
  loading: boolean;
  error: string | null;
  isFallback: boolean;
  source: string;
  selectedBuildingId: string | null;
  onSelectBuilding: (buildingId: string, options?: UrbanBuildingSelectionOptions) => void;
  onRefresh: () => void | Promise<void>;
  onClose: () => void;
}

export default function UrbanIncidentContextModal({
  isOpen,
  incident,
  buildings,
  loading,
  error,
  isFallback,
  source,
  selectedBuildingId,
  onSelectBuilding,
  onRefresh,
  onClose,
}: Props) {
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[1500] bg-slate-950/45 backdrop-blur-[2px]"
            aria-label="Close 3D urban context"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="fixed inset-x-4 bottom-4 top-16 z-[1510] mx-auto flex max-w-6xl flex-col overflow-hidden rounded-[28px] border border-surface-200 bg-surface-50 shadow-[0_36px_120px_rgba(15,23,42,0.32)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-surface-200 bg-white/92 px-5 py-4 backdrop-blur">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Incident Focus Mode
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  3D Incident Building Context
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">
                  Expanded simplified urban context for the currently selected incident.
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-surface-200 bg-white p-2 text-slate-400 transition-colors hover:bg-surface-50 hover:text-slate-600"
                aria-label="Close 3D context modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-5">
              <UrbanIncidentContextCard
                incident={incident}
                buildings={buildings}
                loading={loading}
                error={error}
                isFallback={isFallback}
                source={source}
                selectedBuildingId={selectedBuildingId}
                onSelectBuilding={onSelectBuilding}
                onRefresh={onRefresh}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
