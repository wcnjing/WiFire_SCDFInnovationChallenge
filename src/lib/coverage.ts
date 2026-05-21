import type { BroadRegion, FireStation, CoverageColors, CoverageLevel, TimeOffset } from "@/types";

export function getDegradation(station: FireStation, timeOffset: TimeOffset): number {
  const factors: Record<string, number> = { high: 0.4, medium: 0.2, low: 0.05 };
  return timeOffset * (factors[station.risk] ?? 0.05);
}

export function getAdjustedResponseTime(station: FireStation, timeOffset: TimeOffset, weatherPenalty: number = 0): number {
  return station.avgResponse + getDegradation(station, timeOffset) + weatherPenalty;
}

export function getCoverageLevel(responseTime: number): CoverageLevel {
  if (responseTime <= 8) return "green";
  if (responseTime <= 11) return "amber";
  return "red";
}

export function getCoverageColors(station: FireStation, timeOffset: TimeOffset, weatherPenalty: number = 0): CoverageColors {
  const rt = getAdjustedResponseTime(station, timeOffset, weatherPenalty);
  const level = getCoverageLevel(rt);
  const map: Record<CoverageLevel, CoverageColors> = {
    green: { fill: "rgba(34,197,94,0.15)",  stroke: "rgba(34,197,94,0.6)" },
    amber: { fill: "rgba(245,158,11,0.15)", stroke: "rgba(245,158,11,0.6)" },
    red:   { fill: "rgba(239,68,68,0.15)",  stroke: "rgba(239,68,68,0.6)" },
    grey:  { fill: "rgba(148,163,184,0.15)", stroke: "rgba(148,163,184,0.6)" },
  };
  return map[level];
}

export function toSVGCoords(lat: number, lng: number): { x: number; y: number } {
  return {
    x: ((lng - 103.59) / (104.05 - 103.59)) * 1000,
    y: ((1.47 - lat) / (1.47 - 1.21)) * 600,
  };
}

export function formatResponseTime(minutes: number): string {
  return `${minutes.toFixed(1)}m`;
}

export function calculateOverallHealth(
  regions: { name: BroadRegion; health: number }[],
  timeOffset: TimeOffset,
  regionPenalties: Partial<Record<BroadRegion, number>> = {},
): number {
  const avg = regions.reduce((s, r) => s + r.health, 0) / regions.length;
  const weatherPenalty = regions.reduce((sum, region) => sum + (regionPenalties[region.name] ?? 0), 0) / regions.length;
  return Math.round(Math.max(avg - timeOffset * 0.3 - weatherPenalty, 0));
}

export function calculateAvgResponseTime(
  stations: FireStation[],
  timeOffset: TimeOffset,
  stationPenalties: Partial<Record<number, number>> = {},
): number {
  return stations.reduce((s, st) => s + getAdjustedResponseTime(st, timeOffset, stationPenalties[st.id] ?? 0), 0) / stations.length;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
