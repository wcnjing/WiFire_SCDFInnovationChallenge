import type {
  AIInsight,
  BroadRegion,
  FireStation,
  TimeOffset,
  WeatherRegionImpact,
  WeatherSeverity,
  WeatherStationImpact,
  WeatherSummary,
} from "@/types";
import type {
  NEAForecast,
  NEAStation,
  NEATwentyFourHourPeriod,
  NEATwentyFourHourGeneral,
} from "@/hooks/useNEAWeather";
import { forecastSeverity } from "@/hooks/useNEAWeather";

export interface WeatherOperationalModel {
  stationPenalties: Record<number, number>;
  stationImpacts: Record<number, WeatherStationImpact>;
  regionPenalties: Record<BroadRegion, number>;
  regionImpacts: WeatherRegionImpact[];
  insights: AIInsight[];
  summary: WeatherSummary;
}

const REGION_ORDER: BroadRegion[] = ["Central", "North", "East", "West", "North-East", "South"];
const SEVERITY_SCORE: Record<WeatherSeverity, number> = { clear: 0, cloudy: 1, light: 2, heavy: 3, storm: 4 };
const FORECAST_PENALTY: Record<WeatherSeverity, number> = { clear: 0, cloudy: 0.1, light: 0.35, heavy: 0.8, storm: 1.3 };

function distanceSq(aLat: number, aLng: number, bLat: number, bLng: number) {
  return (aLat - bLat) ** 2 + (aLng - bLng) ** 2;
}

function classifyBroadRegion(lat: number, lng: number): BroadRegion {
  if (lat < 1.305) return "South";
  if (lng < 103.745) return "West";
  if (lng >= 103.9) return lat >= 1.37 ? "North-East" : "East";
  if (lat >= 1.395) return lng >= 103.86 ? "North-East" : "North";
  if (lat >= 1.355) return lng >= 103.855 ? "North-East" : "North";
  if (lng >= 103.86) return "East";
  return "Central";
}

function rainfallPenalty(rainfall: number) {
  if (rainfall >= 4) return 1.35;
  if (rainfall >= 2) return 0.95;
  if (rainfall >= 0.5) return 0.45;
  if (rainfall > 0) return 0.15;
  return 0;
}

function forecastWeight(timeOffset: TimeOffset) {
  if (timeOffset === 0) return 0.35;
  if (timeOffset === 15) return 0.55;
  if (timeOffset === 30) return 0.75;
  return 1;
}

function rainfallWeight(timeOffset: TimeOffset) {
  if (timeOffset === 0) return 1;
  if (timeOffset === 15) return 0.9;
  if (timeOffset === 30) return 0.75;
  return 0.55;
}

function moreSevere(a: WeatherSeverity, b: WeatherSeverity): WeatherSeverity {
  return SEVERITY_SCORE[a] >= SEVERITY_SCORE[b] ? a : b;
}

function severityFromRainfall(rainfall: number): WeatherSeverity {
  if (rainfall >= 4) return "storm";
  if (rainfall >= 2) return "heavy";
  if (rainfall >= 0.5) return "light";
  return "clear";
}

function findNearestForecast(station: FireStation, forecasts: NEAForecast[]) {
  return forecasts.reduce<NEAForecast | null>((best, candidate) => {
    if (!best) return candidate;
    const bestDistance = distanceSq(station.lat, station.lng, best.lat, best.lng);
    const candidateDistance = distanceSq(station.lat, station.lng, candidate.lat, candidate.lng);
    return candidateDistance < bestDistance ? candidate : best;
  }, null);
}

function findNearestRainStation(station: FireStation, rainStations: NEAStation[]) {
  return rainStations.reduce<NEAStation | null>((best, candidate) => {
    if (!best) return candidate;
    const bestDistance = distanceSq(station.lat, station.lng, best.lat, best.lng);
    const candidateDistance = distanceSq(station.lat, station.lng, candidate.lat, candidate.lng);
    return candidateDistance < bestDistance ? candidate : best;
  }, null);
}

function selectTwentyFourHourPeriod(periods: NEATwentyFourHourPeriod[], timeOffset: TimeOffset) {
  if (periods.length === 0) return null;
  const target = Date.now() + timeOffset * 60_000;
  return periods.find((period) => {
    const start = new Date(period.timePeriod.start).getTime();
    const end = new Date(period.timePeriod.end).getTime();
    return target >= start && target < end;
  }) ?? periods[0];
}

function twentyFourHourRegionForecast(
  region: BroadRegion,
  period: NEATwentyFourHourPeriod | null,
): string {
  if (!period) return "Unknown";
  if (region === "North-East") {
    const northText = period.regions.north.text;
    const eastText = period.regions.east.text;
    return SEVERITY_SCORE[forecastSeverity(eastText)] >= SEVERITY_SCORE[forecastSeverity(northText)] ? eastText : northText;
  }
  if (region === "West") return period.regions.west.text;
  if (region === "East") return period.regions.east.text;
  if (region === "North") return period.regions.north.text;
  if (region === "South") return period.regions.south.text;
  return period.regions.central.text;
}

function formatRange(general: NEATwentyFourHourGeneral | null) {
  if (!general) return null;
  return `${general.temperature.low}-${general.temperature.high}${general.temperature.unit === "Degrees Celsius" ? "C" : ""}`;
}

function formatUpdatedLabel(timestamps: Array<string | null | undefined>) {
  const valid = timestamps.filter(Boolean) as string[];
  if (valid.length === 0) return null;
  const latest = valid.sort().slice(-1)[0];
  return new Date(latest).toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function buildWeatherOperationalModel(params: {
  stations: FireStation[];
  forecasts: NEAForecast[];
  rainStations: NEAStation[];
  timeOffset: TimeOffset;
  forecastLabel: string | null;
  rainfallTimestamp: string | null;
  forecastTimestamp: string | null;
  twentyFourHourPeriods: NEATwentyFourHourPeriod[];
  twentyFourHourGeneral: NEATwentyFourHourGeneral | null;
  twentyFourHourUpdatedAt: string | null;
}): WeatherOperationalModel {
  const activeTwentyFourHourPeriod = selectTwentyFourHourPeriod(params.twentyFourHourPeriods, params.timeOffset);
  const stationImpacts = Object.fromEntries(params.stations.map((station) => {
    const nearestForecast = findNearestForecast(station, params.forecasts);
    const nearestRainStation = findNearestRainStation(station, params.rainStations);
    const region = classifyBroadRegion(station.lat, station.lng);
    const areaForecast = nearestForecast?.forecast ?? "Unknown";
    const areaSeverity = forecastSeverity(areaForecast);
    const regionalForecast = twentyFourHourRegionForecast(region, activeTwentyFourHourPeriod);
    const regionalSeverity = forecastSeverity(regionalForecast);
    const rainfall = nearestRainStation?.rainfall ?? 0;
    const combinedSeverity = moreSevere(moreSevere(areaSeverity, regionalSeverity), severityFromRainfall(rainfall));
    const forecastPenalty = Math.max(FORECAST_PENALTY[areaSeverity], FORECAST_PENALTY[regionalSeverity] * 0.8);
    const penalty = Number((forecastPenalty * forecastWeight(params.timeOffset) + rainfallPenalty(rainfall) * rainfallWeight(params.timeOffset)).toFixed(2));

    const impact: WeatherStationImpact = {
      stationId: station.id,
      stationName: station.name,
      region,
      severity: combinedSeverity,
      forecast: areaForecast,
      forecastArea: nearestForecast?.area ?? region,
      rainfall,
      rainfallStation: nearestRainStation?.name ?? "No nearby gauge",
      penalty,
      periodLabel: params.forecastLabel ?? activeTwentyFourHourPeriod?.timePeriod.text ?? "Current window",
    };

    return [station.id, impact];
  }));

  const stationPenalties = Object.fromEntries(
    Object.entries(stationImpacts).map(([stationId, impact]) => [Number(stationId), impact.penalty]),
  );

  const regionImpacts = REGION_ORDER.map((region) => {
    const regionStations = Object.values(stationImpacts).filter((impact) => impact.region === region);
    const topStation = [...regionStations].sort((a, b) => b.penalty - a.penalty)[0];
    const averagePenalty = regionStations.length > 0
      ? regionStations.reduce((sum, impact) => sum + impact.penalty, 0) / regionStations.length
      : 0;

    return {
      region,
      severity: topStation?.severity ?? "clear",
      forecast: topStation?.forecast ?? twentyFourHourRegionForecast(region, activeTwentyFourHourPeriod),
      rainfall: Math.max(0, ...regionStations.map((impact) => impact.rainfall)),
      penalty: Number(averagePenalty.toFixed(2)),
      periodLabel: topStation?.periodLabel ?? (activeTwentyFourHourPeriod?.timePeriod.text ?? "Current window"),
    } satisfies WeatherRegionImpact;
  }).sort((a, b) => b.penalty - a.penalty);

  const regionPenalties = Object.fromEntries(
    regionImpacts.map((impact) => [impact.region, Math.min(14, Math.round(impact.penalty * 6))]),
  ) as Record<BroadRegion, number>;

  const peakRainStation = [...params.rainStations].sort((a, b) => b.rainfall - a.rainfall)[0];
  const topRegion = regionImpacts[0];
  const weatherInsights: AIInsight[] = [];

  if (peakRainStation && peakRainStation.rainfall >= 1) {
    weatherInsights.push({
      id: 1001,
      severity: peakRainStation.rainfall >= 3 ? "critical" : "warning",
      region: classifyBroadRegion(peakRainStation.lat, peakRainStation.lng),
      time: "live rainfall",
      text: `${peakRainStation.rainfall.toFixed(1)} mm/5min observed at ${peakRainStation.name}. Expect slower appliance movement on nearby surface roads.`,
    });
  }

  if (topRegion && topRegion.penalty >= 0.45) {
    weatherInsights.push({
      id: 1002,
      severity: topRegion.penalty >= 1 ? "warning" : "info",
      region: topRegion.region,
      time: "next 2h",
      text: `${topRegion.region} shows the highest weather-adjusted delay risk. ${topRegion.forecast} could add about ${topRegion.penalty.toFixed(1)} min to average response times.`,
    });
  }

  const generalSeverity = params.twentyFourHourGeneral ? forecastSeverity(params.twentyFourHourGeneral.forecast) : null;

  if (params.twentyFourHourGeneral && generalSeverity && SEVERITY_SCORE[generalSeverity] >= SEVERITY_SCORE.heavy) {
    weatherInsights.push({
      id: 1003,
      severity: generalSeverity === "storm" ? "warning" : "info",
      region: "Islandwide",
      time: "24h outlook",
      text: `24-hour outlook: ${params.twentyFourHourGeneral.forecast}. Keep reserve coverage flexible for weather-driven surge or travel delays.`,
    });
  } else if (params.twentyFourHourGeneral) {
    weatherInsights.push({
      id: 1004,
      severity: "info",
      region: "Islandwide",
      time: "24h outlook",
      text: `24-hour outlook: ${params.twentyFourHourGeneral.forecast}. Continue monitoring for localised rainfall spikes even if islandwide conditions stay stable.`,
    });
  }

  const summary: WeatherSummary = {
    peakRainStation: peakRainStation?.name ?? null,
    peakRainfall: peakRainStation?.rainfall ?? 0,
    twoHourWindow: params.forecastLabel,
    topRegion: topRegion?.region ?? null,
    topRegionPenalty: topRegion?.penalty ?? 0,
    topRegionForecast: topRegion?.forecast ?? null,
    twentyFourGeneralForecast: params.twentyFourHourGeneral?.forecast ?? null,
    twentyFourPeriodLabel: activeTwentyFourHourPeriod?.timePeriod.text ?? null,
    temperatureRange: formatRange(params.twentyFourHourGeneral),
    updatedLabel: formatUpdatedLabel([params.rainfallTimestamp, params.forecastTimestamp, params.twentyFourHourUpdatedAt]),
  };

  return {
    stationPenalties,
    stationImpacts,
    regionPenalties,
    regionImpacts,
    insights: weatherInsights,
    summary,
  };
}
