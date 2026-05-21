"use client";
import { useEffect, useState } from "react";
import type { WeatherSeverity } from "@/types";

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

export interface NEARegionalForecast {
  text: string;
  code: string;
}

export interface NEATwentyFourHourPeriod {
  timePeriod: { text: string; start: string; end: string };
  regions: {
    west: NEARegionalForecast;
    east: NEARegionalForecast;
    north: NEARegionalForecast;
    central: NEARegionalForecast;
    south: NEARegionalForecast;
  };
}

export interface NEATwentyFourHourGeneral {
  forecast: string;
  temperature: { low: number; high: number; unit: string };
}

export interface NEAWeatherData {
  stations: NEAStation[];
  forecasts: NEAForecast[];
  validPeriod: { start: string; end: string } | null;
  forecastLabel: string | null;
  rainfallTimestamp: string | null;
  forecastTimestamp: string | null;
  twentyFourHourUpdatedAt: string | null;
  twentyFourHourPeriods: NEATwentyFourHourPeriod[];
  twentyFourHourGeneral: NEATwentyFourHourGeneral | null;
  fetchedAt: number;
}

const RAINFALL_URL = "https://api-open.data.gov.sg/v2/real-time/api/rainfall";
const FORECAST_URL = "https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast";
const TWENTY_FOUR_HOUR_URL = "https://api-open.data.gov.sg/v2/real-time/api/twenty-four-hr-forecast";

export function useNEAWeather(intervalMs = 300_000) { // 5 min
  const [data, setData]       = useState<NEAWeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [rainRes, fcRes, dayRes] = await Promise.all([
          fetch(RAINFALL_URL),
          fetch(FORECAST_URL),
          fetch(TWENTY_FOUR_HOUR_URL),
        ]);
        const rainJson = await rainRes.json();
        const fcJson   = await fcRes.json();
        const dayJson  = await dayRes.json();

        // Build station list with current rainfall reading
        const meta = rainJson.data?.stations ?? [];
        const readings = rainJson.data?.readings?.[0]?.data ?? [];
        const readingMap = new Map<string, number>(
          readings.map((r: any) => [r.stationId, r.value])
        );
        const stations: NEAStation[] = meta.map((s: any) => ({
          id: s.id,
          name: s.name,
          lat: s.location?.latitude,
          lng: s.location?.longitude,
          rainfall: readingMap.get(s.id) ?? 0,
        }));

        // Build area forecast
        const areaMeta = fcJson.data?.area_metadata ?? [];
        const forecastItem = fcJson.data?.items?.[0];
        const fcItems  = forecastItem?.forecasts ?? [];
        const fcMap    = new Map<string, string>(
          fcItems.map((f: any) => [f.area, f.forecast])
        );
        const forecasts: NEAForecast[] = areaMeta.map((a: any) => ({
          area: a.name,
          lat: a.label_location.latitude,
          lng: a.label_location.longitude,
          forecast: fcMap.get(a.name) ?? "Unknown",
        }));

        const validPeriod = forecastItem?.valid_period
          ? { start: forecastItem.valid_period.start, end: forecastItem.valid_period.end }
          : null;

        const twentyFourRecord = dayJson.data?.records?.[0] ?? null;

        if (!cancelled) {
          setData({
            stations,
            forecasts,
            validPeriod,
            forecastLabel: forecastItem?.valid_period?.text ?? null,
            rainfallTimestamp: rainJson.data?.readings?.[0]?.timestamp ?? null,
            forecastTimestamp: forecastItem?.update_timestamp ?? null,
            twentyFourHourUpdatedAt: twentyFourRecord?.updatedTimestamp ?? null,
            twentyFourHourPeriods: twentyFourRecord?.periods ?? [],
            twentyFourHourGeneral: twentyFourRecord?.general
              ? {
                  forecast: twentyFourRecord.general.forecast.text,
                  temperature: twentyFourRecord.general.temperature,
                }
              : null,
            fetchedAt: Date.now(),
          });
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
export function forecastSeverity(f: string): WeatherSeverity {
  const t = f.toLowerCase();
  if (t.includes("thunder")) return "storm";
  if (t.includes("heavy")   || t.includes("showers")) return "heavy";
  if (t.includes("rain")    || t.includes("drizzle")) return "light";
  if (t.includes("cloud")   || t.includes("overcast")) return "cloudy";
  return "clear";
}
