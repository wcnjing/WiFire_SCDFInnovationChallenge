"use client";
import { useEffect, useState } from "react";

export interface LTAIncident {
  Type: string; Latitude: number; Longitude: number; Message: string;
}
export interface LTASpeedBand {
  LinkID: string; RoadName: string; RoadCategory: string; SpeedBand: number;
  StartLon: string; StartLat: string; EndLon: string; EndLat: string;
}
export interface LTARoadWork {
  EventID: string; StartDate: string; EndDate: string;
  SvcDept: string; RoadName: string; Other: string;
}

function useLTA<T>(dataset: string, intervalMs = 120_000) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/lta?dataset=${dataset}`);
        const json = await res.json();
        if (!cancelled) {
          if (json.error) setError(json.error);
          else { setData(json.value); setError(null); }
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [dataset, intervalMs]);

  return { data, loading, error };
}

export const useLTAIncidents  = () => useLTA<LTAIncident>("incidents", 120_000);
export const useLTASpeedBands = () => useLTA<LTASpeedBand>("speedbands", 300_000);
export const useLTARoadWorks  = () => useLTA<LTARoadWork>("roadworks", 600_000);