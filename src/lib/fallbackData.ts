import { FIRE_STATIONS, INCIDENTS } from "@/data/mock";
import type { LTAIncident, LTASpeedBand, LTATravelTime } from "@/hooks/useLTAData";
import type { NEAWeatherData } from "@/hooks/useNEAWeather";

export function buildSimulatedLTAIncidents(): LTAIncident[] {
  return INCIDENTS.filter((incident) => incident.status !== "resolved").map((incident) => ({
    Type: incident.type === "fire" ? "Road Block" : "Heavy Traffic",
    Latitude: incident.lat,
    Longitude: incident.lng,
    Message: `${incident.desc} | simulated ${incident.severity} severity traffic impact`,
  }));
}

export function buildSimulatedLTASpeedBands(): LTASpeedBand[] {
  return [
    {
      LinkID: "SIM-PIE-01",
      RoadName: "PIE",
      RoadCategory: 1,
      SpeedBand: 2,
      StartLon: "103.7865",
      StartLat: "1.3345",
      EndLon: "103.8225",
      EndLat: "1.3375",
    },
    {
      LinkID: "SIM-CTE-01",
      RoadName: "CTE",
      RoadCategory: 1,
      SpeedBand: 3,
      StartLon: "103.8435",
      StartLat: "1.357",
      EndLon: "103.8585",
      EndLat: "1.3245",
    },
    {
      LinkID: "SIM-AYE-01",
      RoadName: "AYE",
      RoadCategory: 1,
      SpeedBand: 4,
      StartLon: "103.7535",
      StartLat: "1.3105",
      EndLon: "103.7925",
      EndLat: "1.3005",
    },
  ];
}

export function buildSimulatedLTATravelTimes(): LTATravelTime[] {
  return [
    { Name: "PIE", Direction: "Eastbound", FarEndPoint: "Changi Airport", StartPoint: "Bukit Batok Rd", EndPoint: "Adam Rd", EstTime: 14 },
    { Name: "CTE", Direction: "Southbound", FarEndPoint: "City", StartPoint: "AMK Ave 1", EndPoint: "Balestier Rd", EstTime: 10 },
    { Name: "AYE", Direction: "Eastbound", FarEndPoint: "CBD", StartPoint: "Jurong Town Hall Rd", EndPoint: "Alexandra Rd", EstTime: 11 },
    { Name: "KPE", Direction: "Southbound", FarEndPoint: "ECP", StartPoint: "Hougang Ave 3", EndPoint: "Mountbatten Rd", EstTime: 8 },
    { Name: "TPE", Direction: "Westbound", FarEndPoint: "SLE", StartPoint: "Punggol Rd", EndPoint: "Lor Halus", EstTime: 6 },
  ];
}

export function buildSimulatedNEAWeather(): NEAWeatherData {
  const now = new Date();
  const plusTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const plusTwelveHours = new Date(now.getTime() + 12 * 60 * 60 * 1000);
  const plusTwentyFourHours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const isoNow = now.toISOString();

  return {
    stations: [
      { id: "sim-bkt", name: "Bukit Timah Gauge", lat: 1.3356, lng: 103.7762, rainfall: 1.8 },
      { id: "sim-jur", name: "Jurong West Gauge", lat: 1.3394, lng: 103.707, rainfall: 0.9 },
      { id: "sim-tmp", name: "Tampines Gauge", lat: 1.3496, lng: 103.9568, rainfall: 1.4 },
      { id: "sim-wdl", name: "Woodlands Gauge", lat: 1.4382, lng: 103.7891, rainfall: 0.4 },
    ],
    forecasts: [
      { area: "Central", lat: 1.3048, lng: 103.8318, forecast: "Cloudy" },
      { area: "Bukit Timah", lat: 1.3356, lng: 103.7762, forecast: "Moderate Rain" },
      { area: "Jurong West", lat: 1.349, lng: 103.705, forecast: "Showers" },
      { area: "Tampines", lat: 1.3526, lng: 103.9442, forecast: "Thundery Showers" },
      { area: "Woodlands", lat: 1.4382, lng: 103.7891, forecast: "Partly Cloudy" },
    ],
    validPeriod: { start: isoNow, end: plusTwoHours.toISOString() },
    forecastLabel: "Simulated next 2 hours",
    rainfallTimestamp: isoNow,
    forecastTimestamp: isoNow,
    twentyFourHourUpdatedAt: isoNow,
    twentyFourHourPeriods: [
      {
        timePeriod: { text: "Simulated 6h operational window", start: isoNow, end: plusTwelveHours.toISOString() },
        regions: {
          west: { text: "Showers", code: "SH" },
          east: { text: "Thundery Showers", code: "TS" },
          north: { text: "Partly Cloudy", code: "PC" },
          central: { text: "Moderate Rain", code: "MR" },
          south: { text: "Cloudy", code: "CL" },
        },
      },
      {
        timePeriod: { text: "Simulated 12h reserve window", start: plusTwelveHours.toISOString(), end: plusTwentyFourHours.toISOString() },
        regions: {
          west: { text: "Cloudy", code: "CL" },
          east: { text: "Showers", code: "SH" },
          north: { text: "Cloudy", code: "CL" },
          central: { text: "Cloudy", code: "CL" },
          south: { text: "Partly Cloudy", code: "PC" },
        },
      },
    ],
    twentyFourHourGeneral: {
      forecast: "Cloudy with passing showers over eastern and central sectors.",
      temperature: { low: 25, high: 31, unit: "Degrees Celsius" },
    },
    fetchedAt: now.getTime(),
  };
}

export function buildSimulatedRouteOrigin() {
  return FIRE_STATIONS[0];
}
