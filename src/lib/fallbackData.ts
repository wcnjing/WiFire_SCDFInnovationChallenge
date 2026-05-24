import { FIRE_STATIONS, INCIDENTS } from "@/data/mock";
import type { UrbanBuildingContext } from "@/types";
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

function metersToLat(meters: number) {
  return meters / 111_320;
}

function metersToLng(meters: number, latitude: number) {
  return meters / (111_320 * Math.cos((latitude * Math.PI) / 180));
}

function estimateDistanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const deltaLat = (aLat - bLat) * 111_320;
  const deltaLng = (aLng - bLng) * 111_320 * Math.cos((((aLat + bLat) / 2) * Math.PI) / 180);
  return Math.sqrt(deltaLat ** 2 + deltaLng ** 2);
}

function heightCategoryForHeight(height: number): UrbanBuildingContext["heightCategory"] {
  if (height >= 40) return "High";
  if (height >= 18) return "Medium";
  if (height > 0) return "Low";
  return "Unknown";
}

export function createFallbackUrbanBuildings(lat: number, lng: number, radius: number) {
  const offsets = [
    { x: -64, y: -38, width: 40, depth: 30, height: 52, type: "Commercial", blockNumber: "101", name: "Harbour View Tower", roadName: "Command Avenue" },
    { x: -20, y: -18, width: 26, depth: 22, height: 28, type: "Mixed Use", blockNumber: "103", name: "Incident Access Block", roadName: "Command Avenue" },
    { x: 16, y: -12, width: 34, depth: 26, height: 62, type: "Residential", blockNumber: "105", name: "Skyline Residences", roadName: "Response Street" },
    { x: 56, y: -42, width: 38, depth: 28, height: 20, type: "Industrial", blockNumber: "107", name: "Logistics Annex", roadName: "Response Street" },
    { x: -54, y: 18, width: 24, depth: 20, height: 16, type: "Residential", blockNumber: "109", name: "Urban Block 5", roadName: "Fireground Link" },
    { x: -8, y: 14, width: 30, depth: 24, height: 46, type: "Commercial", blockNumber: "111", name: "Meridian Offices", roadName: "Fireground Link" },
    { x: 34, y: 22, width: 42, depth: 30, height: 34, type: "Mixed Use", blockNumber: "113", name: "Riverpoint Suites", roadName: "Operations Way" },
    { x: 76, y: 14, width: 22, depth: 18, height: 14, type: "Residential", blockNumber: "115", name: "Urban Block 8", roadName: "Operations Way" },
  ] as const;

  const buildings: UrbanBuildingContext[] = offsets.map((offset, index) => {
    const centerLat = lat + metersToLat(offset.y);
    const centerLng = lng + metersToLng(offset.x, lat);
    const halfWidthLng = metersToLng(offset.width / 2, lat);
    const halfDepthLat = metersToLat(offset.depth / 2);

    const coordinates: [number, number][] = [
      [centerLng - halfWidthLng, centerLat - halfDepthLat],
      [centerLng + halfWidthLng, centerLat - halfDepthLat],
      [centerLng + halfWidthLng, centerLat + halfDepthLat],
      [centerLng - halfWidthLng, centerLat + halfDepthLat],
    ];

    return {
      id: `fallback-building-${index + 1}`,
      name: offset.name,
      blockNumber: offset.blockNumber,
      roadName: offset.roadName,
      postalCode: `12${String(index + 1).padStart(4, "0")}`,
      fullAddress: `Blk ${offset.blockNumber} ${offset.roadName}, Singapore 12${String(index + 1).padStart(4, "0")}`,
      buildingType: offset.type,
      estimatedHeight: offset.height,
      heightCategory: heightCategoryForHeight(offset.height),
      centroid: { lat: centerLat, lng: centerLng },
      coordinates,
      distanceFromIncidentMeters: estimateDistanceMeters(lat, lng, centerLat, centerLng),
      isLikelyIncidentBuilding: false,
    };
  })
    .filter((building) => building.distanceFromIncidentMeters <= Math.max(radius * 1.2, 120))
    .sort((left, right) => left.distanceFromIncidentMeters - right.distanceFromIncidentMeters);

  if (buildings[0]) {
    buildings[0].isLikelyIncidentBuilding = true;
  }

  return buildings.slice(0, 12);
}
