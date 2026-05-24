"use client";
import { useEffect, useMemo } from "react";
import { AlertTriangle, Boxes, Building2, LoaderCircle } from "lucide-react";
import { useURABuildingContext } from "@/hooks/useURABuildingContext";
import type { UrbanBuildingContext } from "@/types";

interface ContextSummary {
  buildingCount: number;
  isFallback: boolean;
  source: string;
  loading: boolean;
  error: string | null;
}

interface Props {
  incidentLatitude: number | null | undefined;
  incidentLongitude: number | null | undefined;
  radius?: number;
  onContextChange?: (summary: ContextSummary) => void;
}

interface ProjectedBuilding {
  building: UrbanBuildingContext;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
}

function polygonPoints(points: Array<[number, number]>) {
  return points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

function centroid(coordinates: [number, number][]) {
  return coordinates.reduce(
    (accumulator, [lng, lat]) => ({
      lng: accumulator.lng + lng / coordinates.length,
      lat: accumulator.lat + lat / coordinates.length,
    }),
    { lng: 0, lat: 0 },
  );
}

function projectBuildings(buildings: UrbanBuildingContext[]) {
  if (buildings.length === 0) return [] as ProjectedBuilding[];

  const centroids = buildings.map((building) => ({
    building,
    ...centroid(building.coordinates),
  }));

  const lngValues = centroids.map((entry) => entry.lng);
  const latValues = centroids.map((entry) => entry.lat);
  const minLng = Math.min(...lngValues);
  const maxLng = Math.max(...lngValues);
  const minLat = Math.min(...latValues);
  const maxLat = Math.max(...latValues);
  const lngSpan = Math.max(maxLng - minLng, 0.00018);
  const latSpan = Math.max(maxLat - minLat, 0.00018);
  const maxHeight = Math.max(...buildings.map((building) => building.estimatedHeight), 18);

  return centroids
    .map((entry) => {
      const normalizedX = (entry.lng - minLng) / lngSpan;
      const normalizedY = (entry.lat - minLat) / latSpan;
      const width = 18 + Math.min(Math.max((entry.building.coordinates.length - 3) * 3, 0), 10);
      const depth = 10 + normalizedY * 4;
      const height = 20 + (entry.building.estimatedHeight / maxHeight) * 64;

      return {
        building: entry.building,
        x: 74 + normalizedX * 188 + normalizedY * 18,
        y: 156 - normalizedY * 54 + normalizedX * 16,
        width,
        depth,
        height,
      } satisfies ProjectedBuilding;
    })
    .sort((left, right) => left.y - right.y);
}

export default function UrbanIncident3D({
  incidentLatitude,
  incidentLongitude,
  radius = 300,
  onContextChange,
}: Props) {
  const { buildings, loading, error, isFallback, source, refetch } = useURABuildingContext(
    incidentLatitude,
    incidentLongitude,
    radius,
  );

  useEffect(() => {
    onContextChange?.({
      buildingCount: buildings.length,
      isFallback,
      source,
      loading,
      error,
    });
  }, [buildings.length, error, isFallback, loading, onContextChange, source]);

  const projectedBuildings = useMemo(
    () => projectBuildings(buildings),
    [buildings],
  );
  const incidentBuilding = projectedBuildings.find((entry) => entry.building.isLikelyIncidentBuilding) ?? projectedBuildings[0] ?? null;

  if (incidentLatitude == null || incidentLongitude == null) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/95 p-4 text-[11px] text-slate-400">
        Select an incident to load indicative urban context.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(circle_at_top,rgba(30,41,59,0.98),rgba(2,6,23,1))] text-white shadow-[0_18px_40px_rgba(15,23,42,0.35)]">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <Building2 size={14} className="text-cyan-300" />
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          URA via data.gov.sg
        </div>
        {isFallback && (
          <div className="ml-auto rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200">
            Fallback demo data
          </div>
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-0">
        <div className="relative px-3 pb-3 pt-2">
          <div className="mb-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>Nearby Urban Density</span>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-full border border-slate-700 bg-slate-900/80 px-2 py-1 font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
            >
              Refresh
            </button>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.82))]">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-[linear-gradient(180deg,rgba(14,165,233,0.03),rgba(56,189,248,0.12))]" />
            <svg viewBox="0 0 320 210" className="h-[220px] w-full">
              <defs>
                <linearGradient id="urban-floor" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#111827" />
                </linearGradient>
              </defs>

              <polygon
                points="42,164 162,112 284,164 164,202"
                fill="url(#urban-floor)"
                stroke="#1e293b"
                strokeWidth="1"
              />

              {[0, 1, 2, 3].map((index) => (
                <line
                  key={`grid-h-${index}`}
                  x1={52 + index * 40}
                  y1={166 - index * 13}
                  x2={166 + index * 30}
                  y2={117 + index * 12}
                  stroke="#1e293b"
                  strokeWidth="1"
                />
              ))}

              {projectedBuildings.map((entry) => {
                const frontFill = entry.building.isLikelyIncidentBuilding ? "#fb7185" : "#38bdf8";
                const sideFill = entry.building.isLikelyIncidentBuilding ? "#be123c" : "#0ea5e9";
                const topFill = entry.building.isLikelyIncidentBuilding ? "#fecdd3" : "#bae6fd";

                const front = polygonPoints([
                  [entry.x - entry.width / 2, entry.y - entry.height],
                  [entry.x + entry.width / 2, entry.y - entry.height],
                  [entry.x + entry.width / 2, entry.y],
                  [entry.x - entry.width / 2, entry.y],
                ]);
                const top = polygonPoints([
                  [entry.x - entry.width / 2, entry.y - entry.height],
                  [entry.x + entry.width / 2, entry.y - entry.height],
                  [entry.x + entry.width / 2 + entry.depth, entry.y - entry.height - entry.depth],
                  [entry.x - entry.width / 2 + entry.depth, entry.y - entry.height - entry.depth],
                ]);
                const side = polygonPoints([
                  [entry.x + entry.width / 2, entry.y - entry.height],
                  [entry.x + entry.width / 2, entry.y],
                  [entry.x + entry.width / 2 + entry.depth, entry.y - entry.depth],
                  [entry.x + entry.width / 2 + entry.depth, entry.y - entry.height - entry.depth],
                ]);

                return (
                  <g key={entry.building.id}>
                    <polygon points={side} fill={sideFill} opacity={0.9} />
                    <polygon points={front} fill={frontFill} opacity={0.92} />
                    <polygon points={top} fill={topFill} opacity={0.95} />
                    {entry.building.isLikelyIncidentBuilding && (
                      <>
                        <circle cx={entry.x + entry.depth * 0.3} cy={entry.y - entry.height - entry.depth - 8} r="5" fill="#f43f5e" />
                        <circle cx={entry.x + entry.depth * 0.3} cy={entry.y - entry.height - entry.depth - 8} r="12" fill="rgba(244,63,94,0.18)" />
                      </>
                    )}
                  </g>
                );
              })}

              {incidentBuilding && (
                <>
                  <line
                    x1={incidentBuilding.x + incidentBuilding.depth * 0.3}
                    y1={incidentBuilding.y - incidentBuilding.height - incidentBuilding.depth - 16}
                    x2={260}
                    y2={32}
                    stroke="#fda4af"
                    strokeDasharray="4 4"
                  />
                  <rect x="214" y="18" rx="10" ry="10" width="88" height="28" fill="rgba(15,23,42,0.9)" stroke="#f43f5e" />
                  <text x="258" y="36" fill="#ffe4e6" fontSize="10" fontWeight="700" textAnchor="middle">
                    Incident Building
                  </text>
                </>
              )}
            </svg>

            {(loading || error) && (
              <div className="absolute inset-x-3 bottom-3 rounded-xl border border-slate-700 bg-slate-950/90 px-3 py-2 text-[10px] text-slate-300">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <LoaderCircle size={12} className="animate-spin text-cyan-300" />
                    Loading indicative urban context...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={12} className="text-amber-300" />
                    Using the latest available urban context state.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-l border-slate-800 bg-slate-950/60 px-3 py-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <Boxes size={12} className="text-slate-500" />
            Context
          </div>

          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-slate-800 bg-slate-900/85 px-2.5 py-2">
              <div className="text-[9px] uppercase tracking-wide text-slate-500">Buildings</div>
              <div className="mt-1 text-lg font-semibold text-white">{buildings.length}</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/85 px-2.5 py-2">
              <div className="text-[9px] uppercase tracking-wide text-slate-500">Source</div>
              <div className="mt-1 text-[11px] font-semibold text-cyan-200">
                {isFallback ? "Fallback demo data" : source}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/85 px-2.5 py-2 text-[10px] leading-relaxed text-slate-400">
              Simplified 3D urban view based on indicative urban context from the public URA building dataset.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
