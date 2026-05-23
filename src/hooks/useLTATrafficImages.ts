"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TrafficCameraSnapshot } from "@/types";

interface TrafficImagesResponse {
  updatedAt?: string;
  cameras?: TrafficCameraSnapshot[];
  error?: string;
}

export function useLTATrafficImages(intervalMs = 240_000) {
  const [cameras, setCameras] = useState<TrafficCameraSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;

    if (mountedRef.current) {
      setLoading(true);
    }

    try {
      const response = await fetch("/api/lta/traffic-images", {
        cache: "no-store",
      });
      const payload = await response.json() as TrafficImagesResponse;

      if (!mountedRef.current || requestId !== requestRef.current) return;

      if (!response.ok || !Array.isArray(payload.cameras)) {
        setError(payload.error ?? `HTTP ${response.status}`);
        return;
      }

      setCameras(payload.cameras);
      setLastUpdated(payload.updatedAt ?? new Date().toISOString());
      setError(null);
    } catch (cause) {
      if (!mountedRef.current || requestId !== requestRef.current) return;
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (mountedRef.current && requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();

    const intervalId = window.setInterval(() => {
      void load();
    }, intervalMs);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
    };
  }, [intervalMs, load]);

  return {
    cameras,
    loading,
    error,
    lastUpdated,
    refetch: load,
  };
}
