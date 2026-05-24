"use client";
import { useEffect, useMemo, useState } from "react";
import { Building2, Expand, MapPinned } from "lucide-react";
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

function toneForIncident(type: Incident["type"]) {
  return type === "fire"
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
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
  const nearbyBuildings = useMemo(
    () => activeBuildings.filter((building) => building.id !== selectedBuilding?.id).slice(0, 6),
    [activeBuildings, selectedBuilding?.id],
  );

  function handleSelectBuilding(buildingId: string, options?: UrbanBuildingSelectionOptions) {
    if (onSelectBuilding) {
      onSelectBuilding(buildingId, options);
      return;
    }

    setInternalSelectedBuildingId(buildingId);
  }

  return (
    <section className="rounded-2xl border border-surface-200 bg-white/95 p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Building2 size={13} className="text-slate-400" />
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          3D Urban Incident Context
        </div>
        <div className="ml-auto flex items-center gap-2">
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-700 transition-colors hover:bg-brand-100"
            >
              <Expand size={11} />
              Expand 3D Context
            </button>
          )}
          <div className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
            activeFallback
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-cyan-200 bg-cyan-50 text-cyan-700"
          }`}>
            {activeFallback ? "Fallback demo data" : activeSource}
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-2xl border border-surface-100 bg-surface-50 p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Incident on this scene</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {incident?.desc ?? "No incident selected"}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
              <MapPinned size={10} className="text-slate-400" />
              {selectedBuilding
                ? getUrbanBuildingAddressLine(selectedBuilding) ?? `${incident?.lat.toFixed(5)}, ${incident?.lng.toFixed(5)}`
                : incident
                  ? `${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)}`
                  : "--"}
            </div>
          </div>

          {incident && (
            <div className="flex flex-wrap gap-1.5">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneForIncident(incident.type)}`}>
                {incident.type}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {incident.severity}
              </span>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                {incident.status}
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-surface-100 bg-white px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Likely incident building</div>
            <div className="mt-1 text-[11px] font-semibold text-slate-800">
              {incidentBuilding ? getUrbanBuildingDisplayLabel(incidentBuilding) : "Waiting for urban context"}
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {incidentBuilding ? getUrbanBuildingAddressLine(incidentBuilding) ?? "Address not available" : "No building mapped yet"}
            </div>
          </div>
          <div className="rounded-xl border border-surface-100 bg-white px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Surrounding buildings</div>
            <div className="mt-1 text-[11px] font-semibold text-slate-800">
              {activeLoading ? "Loading..." : `${activeBuildings.length} labelled blocks`}
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              Click any block to highlight it on the map and inspect its details.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3">
        <UrbanIncident3D
          incident={incident}
          buildings={activeBuildings}
          loading={activeLoading}
          error={activeError}
          isFallback={activeFallback}
          source={activeSource}
          selectedBuildingId={selectedBuilding?.id ?? null}
          onSelectBuilding={handleSelectBuilding}
          onRefresh={refreshBuildings}
        />
      </div>

      {previewMode ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="rounded-2xl border border-surface-100 bg-surface-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Selected building details</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedBuilding ? getUrbanBuildingDisplayLabel(selectedBuilding) : "No building selected"}
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  {selectedBuilding ? getUrbanBuildingAddressLine(selectedBuilding) ?? "Address not available" : "Select a building from the 3D scene to inspect the incident block."}
                </div>
              </div>

              {selectedBuilding && (
                <button
                  type="button"
                  onClick={() => handleSelectBuilding(selectedBuilding.id, { focusMap: true })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                >
                  Locate on map
                </button>
              )}
            </div>

            {selectedBuilding && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Map label</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-800">{getUrbanBuildingMapLabel(selectedBuilding)}</div>
                </div>
                <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Distance</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-800">
                    {selectedBuilding.distanceFromIncidentMeters.toFixed(0)} m
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-surface-100 bg-surface-50 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Nearby Buildings
            </div>
            <div className="mt-3 space-y-2">
              {selectedBuilding && (
                <button
                  type="button"
                  onClick={() => handleSelectBuilding(selectedBuilding.id, { focusMap: true })}
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-left transition-colors hover:bg-brand-100"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-brand-900">
                      {getUrbanBuildingDisplayLabel(selectedBuilding)}
                    </div>
                    <div className="mt-1 text-[10px] leading-relaxed text-brand-800">
                      {getUrbanBuildingSecondaryLabel(selectedBuilding) ?? "Currently selected on the map and in the 3D view."}
                    </div>
                  </div>
                  <span className="rounded-full border border-brand-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-700">
                    {selectedBuilding.isLikelyIncidentBuilding ? "Incident building" : "Selected"}
                  </span>
                </button>
              )}

              {nearbyBuildings.slice(0, 3).map((building) => (
                <button
                  key={building.id}
                  type="button"
                  onClick={() => handleSelectBuilding(building.id, { focusMap: true })}
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-surface-100 bg-white px-3 py-2.5 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-800">
                      {getUrbanBuildingDisplayLabel(building)}
                    </div>
                    <div className="mt-1 text-[10px] leading-relaxed text-slate-500">
                      {getUrbanBuildingSecondaryLabel(building) ?? "Address not available"}
                    </div>
                  </div>
                  {building.isLikelyIncidentBuilding && (
                    <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-700">
                      Incident building
                    </span>
                  )}
                </button>
              ))}

              {!selectedBuilding && !nearbyBuildings.length && (
                <div className="rounded-xl border border-dashed border-surface-200 bg-white px-3 py-3 text-[11px] text-slate-500">
                  Select an incident to inspect nearby buildings and locate them on the map.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 rounded-2xl border border-surface-100 bg-surface-50 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-slate-400">Selected building details</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedBuilding ? getUrbanBuildingDisplayLabel(selectedBuilding) : "No building selected"}
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-slate-500">
                  {selectedBuilding ? getUrbanBuildingAddressLine(selectedBuilding) ?? "Address not available" : "Pick a block from the 3D view or nearby list."}
                </div>
              </div>

              {selectedBuilding && (
                <button
                  type="button"
                  onClick={() => handleSelectBuilding(selectedBuilding.id, { focusMap: true })}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                >
                  Locate on map
                </button>
              )}
            </div>

            {selectedBuilding && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Map label</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-800">{getUrbanBuildingMapLabel(selectedBuilding)}</div>
                </div>
                <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Estimated height</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-800">
                    {selectedBuilding.estimatedHeight} m ({selectedBuilding.heightCategory})
                  </div>
                </div>
                <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Building type</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-800">{selectedBuilding.buildingType ?? "Unknown"}</div>
                </div>
                <div className="rounded-xl border border-white/80 bg-white px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-slate-400">Distance from incident</div>
                  <div className="mt-1 text-[11px] font-semibold text-slate-800">
                    {selectedBuilding.distanceFromIncidentMeters.toFixed(0)} m
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-surface-100 bg-surface-50 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Nearby Buildings
            </div>
            <div className="mt-3 space-y-2">
              {selectedBuilding && (
                <button
                  type="button"
                  onClick={() => handleSelectBuilding(selectedBuilding.id, { focusMap: true })}
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-left transition-colors hover:bg-brand-100"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-brand-900">
                      {getUrbanBuildingDisplayLabel(selectedBuilding)}
                    </div>
                    <div className="mt-1 text-[10px] leading-relaxed text-brand-800">
                      {getUrbanBuildingSecondaryLabel(selectedBuilding) ?? "Currently selected on the map and in the 3D view."}
                    </div>
                  </div>
                  <span className="rounded-full border border-brand-200 bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-brand-700">
                    {selectedBuilding.isLikelyIncidentBuilding ? "Incident building" : "Selected"}
                  </span>
                </button>
              )}

              {nearbyBuildings.map((building) => (
                <button
                  key={building.id}
                  type="button"
                  onClick={() => handleSelectBuilding(building.id, { focusMap: true })}
                  className="flex w-full items-start justify-between gap-3 rounded-xl border border-surface-100 bg-white px-3 py-2.5 text-left transition-colors hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-800">
                      {getUrbanBuildingDisplayLabel(building)}
                    </div>
                    <div className="mt-1 text-[10px] leading-relaxed text-slate-500">
                      {getUrbanBuildingSecondaryLabel(building) ?? "Address not available"}
                    </div>
                  </div>
                  {building.isLikelyIncidentBuilding && (
                    <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-red-700">
                      Incident building
                    </span>
                  )}
                </button>
              ))}

              {!selectedBuilding && !nearbyBuildings.length && (
                <div className="rounded-xl border border-dashed border-surface-200 bg-white px-3 py-3 text-[11px] text-slate-500">
                  Select an incident to inspect nearby buildings and locate them on the map.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
