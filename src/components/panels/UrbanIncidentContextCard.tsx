"use client";
import { useEffect, useMemo, useState } from "react";
import { Boxes, Building2, Expand, MapPinned } from "lucide-react";
import UrbanIncident3D from "@/components/map/UrbanIncident3D";
import { useURABuildingContext } from "@/hooks/useURABuildingContext";
import {
  getUrbanBuildingAddressLine,
  getUrbanBuildingDisplayLabel,
  getUrbanBuildingMapLabel,
  getUrbanBuildingSecondaryLabel,
} from "@/lib/urbanContext";
import type { Incident, UrbanBuildingContext, UrbanBuildingSelectionOptions } from "@/types";

interface Props {
  incident: Incident | null;
  buildings?: UrbanBuildingContext[];
  loading?: boolean;
  error?: string | null;
  isFallback?: boolean;
  source?: string;
  selectedBuildingId?: string | null;
  onSelectBuilding?: (buildingId: string, options?: UrbanBuildingSelectionOptions) => void;
  onRefresh?: () => void | Promise<void>;
  previewMode?: boolean;
  onExpand?: () => void;
}

function getIncidentTone(type: Incident["type"]) {
  return type === "fire"
    ? "border-rose-300/45 bg-rose-500/14 text-rose-100"
    : "border-amber-300/45 bg-amber-400/14 text-amber-100";
}

function getSourceLabel(source: string, isFallback: boolean) {
  if (isFallback) return "Fallback demo data";
  if (source.toLowerCase().includes("ura") || source.toLowerCase().includes("data.gov.sg")) {
    return "URA / data.gov.sg";
  }
  return source;
}

export default function UrbanIncidentContextCard({
  incident,
  buildings,
  loading,
  error,
  isFallback,
  source,
  selectedBuildingId,
  onSelectBuilding,
  onRefresh,
  previewMode = false,
  onExpand,
}: Props) {
  const usingControlledData = Array.isArray(buildings);
  const {
    buildings: fetchedBuildings,
    loading: fetchedLoading,
    error: fetchedError,
    isFallback: fetchedFallback,
    source: fetchedSource,
    refetch: refetchFetchedBuildings,
  } = useURABuildingContext(
    usingControlledData ? null : incident?.lat ?? null,
    usingControlledData ? null : incident?.lng ?? null,
    360,
  );
  const [internalSelectedBuildingId, setInternalSelectedBuildingId] = useState<string | null>(null);

  const activeBuildings = usingControlledData ? buildings : fetchedBuildings;
  const activeLoading = usingControlledData ? Boolean(loading) : fetchedLoading;
  const activeError = usingControlledData ? (error ?? null) : fetchedError;
  const activeFallback = usingControlledData ? Boolean(isFallback) : fetchedFallback;
  const activeSource = usingControlledData ? (source ?? "URA via data.gov.sg") : fetchedSource;
  const sourceLabel = getSourceLabel(activeSource, activeFallback);
  const refreshBuildings = onRefresh ?? refetchFetchedBuildings;
  const effectiveSelectedBuildingId = selectedBuildingId ?? internalSelectedBuildingId;

  useEffect(() => {
    if (selectedBuildingId != null) return;

    if (internalSelectedBuildingId && !activeBuildings.some((building) => building.id === internalSelectedBuildingId)) {
      setInternalSelectedBuildingId(null);
    }
  }, [activeBuildings, internalSelectedBuildingId, selectedBuildingId]);

  const selectedBuilding = useMemo(
    () => activeBuildings.find((building) => building.id === effectiveSelectedBuildingId) ?? null,
    [activeBuildings, effectiveSelectedBuildingId],
  );
  const incidentBuilding = useMemo(
    () => activeBuildings.find((building) => building.isLikelyIncidentBuilding) ?? activeBuildings[0] ?? null,
    [activeBuildings],
  );
  const focusBuilding = selectedBuilding ?? incidentBuilding ?? null;
  const nearbyBuildings = useMemo(
    () => activeBuildings.filter((building) => building.id !== focusBuilding?.id).slice(0, previewMode ? 3 : 6),
    [activeBuildings, focusBuilding?.id, previewMode],
  );

  function handleSelectBuilding(buildingId: string, options?: UrbanBuildingSelectionOptions) {
    if (onSelectBuilding) {
      onSelectBuilding(buildingId, options);
      return;
    }

    setInternalSelectedBuildingId(buildingId);
  }

  if (!incident) {
    return (
      <section className="rounded-[24px] border border-slate-800 bg-[radial-gradient(circle_at_top,rgba(30,41,59,0.98),rgba(2,6,23,1))] p-4 text-slate-300 shadow-[0_18px_40px_rgba(15,23,42,0.35)]">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-cyan-300" />
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
            3D Incident Building Context
          </div>
        </div>
        <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/75 px-4 py-4 text-[11px] text-slate-400">
          Select an incident to generate simplified 3D urban context around the selected location.
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[24px] border border-slate-800 bg-[radial-gradient(circle_at_top,rgba(30,41,59,0.98),rgba(2,6,23,1))] p-3 text-white shadow-[0_18px_40px_rgba(15,23,42,0.35)]">
      <div className="flex flex-wrap items-center gap-2">
        <Building2 size={14} className="text-cyan-300" />
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
          3D Incident Building Context
        </div>
        <div className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide ${
          activeFallback
            ? "border-amber-300/45 bg-amber-400/14 text-amber-100"
            : "border-cyan-300/40 bg-cyan-400/10 text-cyan-100"
        }`}>
          {sourceLabel}
        </div>
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
          >
            <Expand size={11} />
            Expand Context
          </button>
        )}
      </div>

      <div className="mt-3 rounded-[22px] border border-slate-800 bg-slate-950/78 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">
              Generated Around Selected Incident
            </div>
            <div className="mt-1 text-sm font-semibold text-white">
              Incident #{incident.id}: {incident.desc}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              Simplified 3D urban context generated around the selected incident location. Building heights are indicative where exact height is unavailable.
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getIncidentTone(incident.type)}`}>
              {incident.type}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
              {incident.severity}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-200">
              {incident.status}
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Location</div>
            <div className="mt-1 text-[11px] font-semibold text-slate-100">
              {focusBuilding ? getUrbanBuildingAddressLine(focusBuilding) ?? "Address unavailable" : "Address unavailable"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
              <MapPinned size={11} className="text-slate-500" />
              Coordinates
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-100">
              {incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2.5">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-slate-500">
              <Boxes size={11} className="text-slate-500" />
              Nearby Buildings
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-100">
              {activeLoading ? "Loading..." : `${activeBuildings.length} blocks returned`}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Data Source</div>
            <div className="mt-1 text-[11px] font-semibold text-slate-100">{sourceLabel}</div>
          </div>
        </div>

        {activeError && (
          <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[11px] text-amber-100">
            Building context feed returned a partial response: {activeError}
          </div>
        )}
      </div>

      <div className="mt-3">
        <UrbanIncident3D
          incident={incident}
          buildings={activeBuildings}
          loading={activeLoading}
          error={activeError}
          isFallback={activeFallback}
          source={activeSource}
          selectedBuildingId={focusBuilding?.id ?? null}
          onSelectBuilding={handleSelectBuilding}
          onRefresh={refreshBuildings}
        />
      </div>

      <div className={`mt-3 grid gap-3 ${previewMode ? "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]" : "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"}`}>
        <div className="rounded-[22px] border border-slate-800 bg-slate-950/78 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Selected Building</div>
              <div className="mt-1 text-sm font-semibold text-white">
                {focusBuilding ? getUrbanBuildingDisplayLabel(focusBuilding) : "No building selected"}
              </div>
              <div className="mt-1 text-[11px] leading-relaxed text-slate-400">
                {focusBuilding ? getUrbanBuildingAddressLine(focusBuilding) ?? "Address unavailable" : "Pick a block from the 3D view or nearby list."}
              </div>
            </div>

            {focusBuilding && (
              <button
                type="button"
                onClick={() => handleSelectBuilding(focusBuilding.id, { focusMap: true })}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-100 transition-colors hover:border-cyan-300 hover:bg-cyan-400/16"
              >
                Locate on map
              </button>
            )}
          </div>

          {focusBuilding && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Incident Building</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-100">
                  {focusBuilding.isLikelyIncidentBuilding ? "Yes" : "Nearby Building"}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Map Label</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-100">{getUrbanBuildingMapLabel(focusBuilding)}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Indicative Height</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-100">
                  {focusBuilding.estimatedHeight} m ({focusBuilding.heightCategory})
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">Distance</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-100">
                  {focusBuilding.distanceFromIncidentMeters.toFixed(0)} m
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[22px] border border-slate-800 bg-slate-950/78 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Nearby Buildings
          </div>
          <div className="mt-3 space-y-2">
            {nearbyBuildings.map((building) => (
              <button
                key={building.id}
                type="button"
                onClick={() => handleSelectBuilding(building.id, { focusMap: true })}
                className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/75 px-3 py-2.5 text-left transition-colors hover:border-cyan-400/35 hover:bg-slate-900"
              >
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-slate-100">
                    {getUrbanBuildingDisplayLabel(building)}
                  </div>
                  <div className="mt-1 text-[10px] leading-relaxed text-slate-400">
                    {getUrbanBuildingSecondaryLabel(building) ?? "Address unavailable"}
                  </div>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                  building.isLikelyIncidentBuilding
                    ? "border-rose-300/45 bg-rose-500/14 text-rose-100"
                    : "border-slate-700 bg-slate-950/80 text-slate-200"
                }`}>
                  {building.isLikelyIncidentBuilding ? "Incident Building" : "Nearby"}
                </span>
              </button>
            ))}

            {!nearbyBuildings.length && (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/55 px-3 py-3 text-[11px] text-slate-400">
                Nearby buildings will appear here once building context is available for the selected incident.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
