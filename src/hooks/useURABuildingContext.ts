"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { URABuildingContextResponse, UrbanBuildingContext } from "@/types";

interface State {
  buildings: UrbanBuildingContext[];
  loading: boolean;
  error: string | null;
  isFallback: boolean;
  source: string;
}

export function useURABuildingContext(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  radius = 300,
) {
  const [state, setState] = useState<State>({
    buildings: [],
    loading: false,
    error: null,
    isFallback: true,
    source: "URA via data.gov.sg",
  });
  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    if (latitude == null || longitude == null) {
      if (mountedRef.current) {
        setState({
          buildings: [],
          loading: false,
          error: null,
          isFallback: true,
          source: "URA via data.gov.sg",
        });
      }
      return;
    }

    const requestId = ++requestRef.current;

    if (mountedRef.current) {
      setState((current) => ({
        ...current,
        loading: true,
        error: null,
      }));
    }

    try {
      const response = await fetch(
        `/api/ura/building-context?lat=${latitude.toFixed(6)}&lng=${longitude.toFixed(6)}&radius=${Math.round(radius)}`,
        { cache: "no-store" },
      );
      const payload = await response.json() as Partial<URABuildingContextResponse> & { error?: string };

      if (!mountedRef.current || requestId !== requestRef.current) return;

      if (!response.ok || !Array.isArray(payload.buildings)) {
        setState((current) => ({
          ...current,
          loading: false,
          error: payload.error ?? `HTTP ${response.status}`,
        }));
        return;
      }

      setState({
        buildings: payload.buildings,
        loading: false,
        error: null,
        isFallback: Boolean(payload.isFallback),
        source: payload.source ?? "URA via data.gov.sg",
      });
    } catch (error) {
      if (!mountedRef.current || requestId !== requestRef.current) return;

      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [latitude, longitude, radius]);

  useEffect(() => {
    mountedRef.current = true;
    void load();

    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  return {
    buildings: state.buildings,
    loading: state.loading,
    error: state.error,
    isFallback: state.isFallback,
    source: state.source,
    refetch: load,
  };
}
