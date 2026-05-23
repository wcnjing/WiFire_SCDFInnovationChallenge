"use client";
import { useEffect, useState } from "react";
import type { LatLng, OneMapRouteData, OneMapRouteMode } from "@/types";

interface Params {
  start: LatLng | null;
  end: LatLng | null;
  mode: OneMapRouteMode;
}

export function useOneMapRoute({ start, end, mode }: Params) {
  const [data, setData] = useState<OneMapRouteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!start || !end) {
      setData(null);
      setLoading(false);
      setError(null);
      setFetchedAt(null);
      return;
    }

    const controller = new AbortController();
    const startParam = `${start.lat},${start.lng}`;
    const endParam = `${end.lat},${end.lng}`;
    const url = `/api/onemap/route?start=${encodeURIComponent(startParam)}&end=${encodeURIComponent(endParam)}&routeType=${mode}`;

    async function load() {
      setLoading(true);
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
        });
        const json = await response.json();

        if (!response.ok || json.error) {
          setError(json.error ?? `HTTP ${response.status}`);
          setData(null);
          setFetchedAt(null);
          return;
        }

        setData(json as OneMapRouteData);
        setFetchedAt(json.fetchedAt ?? Date.now());
        setError(null);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return;
        setError(String(fetchError));
        setData(null);
        setFetchedAt(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [start?.lat, start?.lng, end?.lat, end?.lng, mode]);

  return { data, loading, error, fetchedAt };
}
