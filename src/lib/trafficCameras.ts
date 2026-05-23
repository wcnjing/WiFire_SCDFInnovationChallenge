import type { FireStation, Incident, TrafficCameraSnapshot } from "@/types";

export interface TrafficCameraFocusPoint {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  tone: "station" | "incident";
}

export interface RankedTrafficCameraSnapshot extends TrafficCameraSnapshot {
  focusLabel: string;
  distanceKm: number;
  tone: "station" | "incident";
}

export function estimateTrafficCameraDistanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const averageLat = ((aLat + bLat) / 2) * (Math.PI / 180);
  const latKm = (aLat - bLat) * 111;
  const lngKm = (aLng - bLng) * 111 * Math.cos(averageLat);
  return Math.sqrt(latKm ** 2 + lngKm ** 2);
}

export function buildTrafficCameraFocusPoints(
  selectedStation: FireStation | null,
  incidents: Incident[],
  selectedIncidentId: number | null,
): TrafficCameraFocusPoint[] {
  const focusPoints: TrafficCameraFocusPoint[] = [];

  if (selectedStation) {
    focusPoints.push({
      id: `station-${selectedStation.id}`,
      label: `Near ${selectedStation.name}`,
      latitude: selectedStation.lat,
      longitude: selectedStation.lng,
      tone: "station",
    });
  }

  const selectedIncident = incidents.find((incident) => incident.id === selectedIncidentId) ?? null;
  if (selectedIncident) {
    focusPoints.push({
      id: `incident-${selectedIncident.id}`,
      label: `Near ${selectedIncident.desc}`,
      latitude: selectedIncident.lat,
      longitude: selectedIncident.lng,
      tone: "incident",
    });
  }

  incidents
    .filter((incident) => incident.id !== selectedIncidentId)
    .slice(0, 3)
    .forEach((incident) => {
      focusPoints.push({
        id: `incident-${incident.id}`,
        label: `Near ${incident.desc}`,
        latitude: incident.lat,
        longitude: incident.lng,
        tone: "incident",
      });
    });

  return focusPoints;
}

export function rankTrafficCameraSnapshots(
  cameras: TrafficCameraSnapshot[],
  focusPoints: TrafficCameraFocusPoint[],
  limit = 4,
): RankedTrafficCameraSnapshot[] {
  if (focusPoints.length === 0) {
    return cameras.slice(0, limit).map((camera) => ({
      ...camera,
      focusLabel: "Islandwide traffic context",
      distanceKm: 0,
      tone: "incident",
    }));
  }

  return cameras
    .map((camera) => {
      const nearest = focusPoints.reduce((best, focus) => {
        const distanceKm = estimateTrafficCameraDistanceKm(
          camera.latitude,
          camera.longitude,
          focus.latitude,
          focus.longitude,
        );

        if (!best || distanceKm < best.distanceKm) {
          return { focus, distanceKm };
        }

        return best;
      }, null as { focus: TrafficCameraFocusPoint; distanceKm: number } | null);

      if (!nearest) return null;

      return {
        ...camera,
        focusLabel: nearest.focus.label,
        distanceKm: nearest.distanceKm,
        tone: nearest.focus.tone,
      } satisfies RankedTrafficCameraSnapshot;
    })
    .filter((camera): camera is RankedTrafficCameraSnapshot => camera !== null)
    .sort((left, right) => left.distanceKm - right.distanceKm)
    .slice(0, limit);
}
