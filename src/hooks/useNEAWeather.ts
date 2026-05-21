"use client";
import { useEffect, useState } from "react";

export interface NEAStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  rainfall: number; // mm in last 5 min
}

export interface NEAForecast {
  area: string;
  lat: number;
  lng: number;
  forecast: string; // "Thundery Showers", "Cloudy", etc.
}

export interface NEAWeatherData {
  stations: NEAStation[];
  forecasts: NEAForecast[];
  validPeriod: { start: string; end: string } | null;
  fetchedAt: number;
}

const RAINFALL_URL  = "https://api.data.gov.sg/v1/environment/rainfall";
const FORECAST_URL  = "https://api.data.gov.sg/v1/environment/2-hour-weather-forecast";

export function useNEAWeather(intervalMs = 300_000) { // 5 min
  const [data, setData]       = useState<NEAWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [rainRes, fcRes] = await Promise.all([
          fetch(RAINFALL_URL),
          fetch(FORECAST_URL),
        ]);
        const rainJson = await rainRes.json();
        const fcJson   = await fcRes.json();

        // Build station list with current rainfall reading
        const meta = rainJson.metadata?.stations ?? [];
        const readings = rainJson.items?.[0]?.readings ?? [];
        const readingMap = new Map<string, number>(
          readings.map((r: any) => [r.station_id, r.value])
        );
        const stations: NEAStation[] = meta.map((s: any) => ({
          id: s.id,
          name: s.name,
          lat: s.location.latitude,
          lng: s.location.longitude,
          rainfall: readingMap.get(s.id) ?? 0,
        }));

        // Build area forecast
        const areaMeta = fcJson.area_metadata ?? [];
        const fcItems  = fcJson.items?.[0]?.forecasts ?? [];
        const fcMap    = new Map<string, string>(
          fcItems.map((f: any) => [f.area, f.forecast])
        );
        const forecasts: NEAForecast[] = areaMeta.map((a: any) => ({
          area: a.name,
          lat: a.label_location.latitude,
          lng: a.label_location.longitude,
          forecast: fcMap.get(a.name) ?? "Unknown",
        }));

        const validPeriod = fcJson.items?.[0]?.valid_period
          ? { start: fcJson.items[0].valid_period.start, end: fcJson.items[0].valid_period.end }
          : null;

        if (!cancelled) {
          setData({ stations, forecasts, validPeriod, fetchedAt: Date.now() });
          setError(null);
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
  }, [intervalMs]);

  return { data, loading, error };
}

// Classify forecast text into a severity level for visual styling
export function forecastSeverity(f: string): "clear" | "cloudy" | "light" | "heavy" | "storm" {
  const t = f.toLowerCase();
  if (t.includes("thunder")) return "storm";
  if (t.includes("heavy")   || t.includes("showers")) return "heavy";
  if (t.includes("rain")    || t.includes("drizzle")) return "light";
  if (t.includes("cloud")   || t.includes("overcast")) return "cloudy";
  return "clear";
}