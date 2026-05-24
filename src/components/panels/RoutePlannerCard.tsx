"use client";
import { LoaderCircle, Navigation, Route } from "lucide-react";
import type { FireStation, Incident, OneMapRouteData, OneMapRouteMode } from "@/types";

interface Props {
  station: FireStation | null;
  incidents: Incident[];
  selectedIncidentId: number | null;
  onIncidentChange: (incidentId: number) => void;
  routeMode: OneMapRouteMode;
  onRouteModeChange: (mode: OneMapRouteMode) => void;
  route: OneMapRouteData | null;
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
  showHeader?: boolean;
}

const ROUTE_MODES: OneMapRouteMode[] = ["drive", "walk", "cycle"];

function formatUpdatedLabel(timestamp: number | null) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleTimeString("en-SG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatMinutes(totalTimeSeconds: number) {
  return `${Math.max(totalTimeSeconds / 60, 0.1).toFixed(1)} min`;
}

function formatDistance(totalDistanceMeters: number) {
  return totalDistanceMeters >= 1000
    ? `${(totalDistanceMeters / 1000).toFixed(2)} km`
    : `${Math.round(totalDistanceMeters)} m`;
}

export default function RoutePlannerCard({
  station,
  incidents,
  selectedIncidentId,
  onIncidentChange,
  routeMode,
  onRouteModeChange,
  route,
  loading,
  error,
  fetchedAt,
  showHeader = true,
}: Props) {
  const updatedLabel = formatUpdatedLabel(fetchedAt);

  return (
    <div>
      {showHeader && (
        <div className="border-b border-surface-100 px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Navigation size={11} className="text-slate-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">OneMap Routing</span>
            {updatedLabel && <span className="ml-auto text-[10px] font-mono text-slate-400">{updatedLabel}</span>}
          </div>
        </div>
      )}

      <div className="p-3 border-b border-surface-50 space-y-2.5">
        {!station && (
          <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-100 text-[11px] text-slate-500">
            Select a fire station on the map to calculate a live Singapore route with OneMap.
          </div>
        )}

        {station && (
          <>
            <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-100">
              <div className="text-[10px] text-slate-400">Origin station</div>
              <div className="text-xs font-semibold text-slate-800">{station.name}</div>
            </div>

            {incidents.length > 0 ? (
              <>
                <div>
                  <label className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Target incident</label>
                  <select
                    value={selectedIncidentId ?? ""}
                    onChange={(event) => onIncidentChange(Number(event.target.value))}
                    className="mt-1 w-full rounded-lg border border-surface-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none focus:border-brand-400"
                  >
                    {incidents.map((incident) => (
                      <option key={incident.id} value={incident.id}>
                        {incident.desc} | {incident.severity.toUpperCase()} | {incident.timestamp ?? "--"}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1">Mode</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {ROUTE_MODES.map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onRouteModeChange(mode)}
                        className={`rounded-lg border px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                          routeMode === mode
                            ? "border-brand-300 bg-brand-50 text-brand-700"
                            : "border-surface-200 bg-white text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-100 text-[11px] text-slate-500">
                No incidents available for route planning.
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 rounded-lg border border-surface-100 bg-surface-50 px-2.5 py-2 text-[11px] text-slate-500">
                <LoaderCircle size={13} className="animate-spin text-slate-400" />
                Calculating OneMap route...
              </div>
            )}

            {!loading && error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-[11px] text-red-600">
                OneMap route unavailable. {error}
              </div>
            )}

            {!loading && !error && route && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-100">
                    <div className="text-[10px] text-slate-400">Estimated travel time</div>
                    <div className="text-sm font-bold text-slate-800">{formatMinutes(route.summary.totalTimeSeconds)}</div>
                  </div>
                  <div className="p-2.5 bg-surface-50 rounded-lg border border-surface-100">
                    <div className="text-[10px] text-slate-400">Route distance</div>
                    <div className="text-sm font-bold text-slate-800">{formatDistance(route.summary.totalDistanceMeters)}</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg border border-surface-100 bg-white">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                    <Route size={11} className="text-slate-400" />
                    Live route summary
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {route.summary.startPoint || "Selected station"} to {route.summary.endPoint || "Incident location"}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {route.instructionCount} navigation steps returned by OneMap. Path rendered on the map.
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
