export interface FireStation {
  id: number; name: string; lat: number; lng: number;
  readiness: number; avgResponse: number; units: number;
  coverage: string; risk: "low" | "medium" | "high";
}

export type BroadRegion = "Central" | "North" | "East" | "West" | "North-East" | "South";
export type WeatherSeverity = "clear" | "cloudy" | "light" | "heavy" | "storm";

export type IncidentType = "fire" | "medical";
export type IncidentSeverity = "low" | "medium" | "high";
export type IncidentStatus = "active" | "responding" | "resolved";

export interface Incident {
  id: number; type: IncidentType; lat: number; lng: number;
  severity: IncidentSeverity; status: IncidentStatus;
  desc: string; timestamp?: string;
}

export type InsightSeverity = "info" | "warning" | "critical";

export interface AIInsight {
  id: number; severity: InsightSeverity; text: string;
  time: string; region: string;
  prediction?: string;
  impact?: string;
  action?: string;
  confidence?: number;
}

export type TrendDirection = "stable" | "degrading" | "improving";

export interface Region {
  name: BroadRegion; health: number; stations: number;
  avgResponse: number; trend: TrendDirection;
}

export type CoverageLevel = "green" | "amber" | "red" | "grey";
export interface CoverageColors { fill: string; stroke: string; }

export type ViewMode = "coverage" | "response";
export type IncidentFilter = "all" | "cardiac" | "fire" | "medical";
export type TimeOffset = 0 | 15 | 30 | 60;
export type ScenarioPreset = "normal" | "morning-peak" | "heavy-rain" | "pie-accident" | "major-event";

export interface AppState {
  activeView: ViewMode; timeOffset: TimeOffset;
  selectedStation: FireStation | null;
  leftPanelOpen: boolean; rightPanelOpen: boolean;
  showTraffic: boolean; showWeather: boolean; showIncidents: boolean;
  incidentType: IncidentFilter;
}

export interface KPIData {
  label: string; value: string | number;
  status: "green" | "amber" | "red" | "neutral";
}

export interface VolunteerZone {
  id: number; lat: number; lng: number;
  density: number; aedCount: number; responseProbability: number;
}

export interface WeatherRegionImpact {
  region: BroadRegion;
  severity: WeatherSeverity;
  forecast: string;
  rainfall: number;
  penalty: number;
  periodLabel: string;
}

export interface WeatherStationImpact {
  stationId: number;
  stationName: string;
  region: BroadRegion;
  severity: WeatherSeverity;
  forecast: string;
  forecastArea: string;
  rainfall: number;
  rainfallStation: string;
  penalty: number;
  periodLabel: string;
}

export interface WeatherSummary {
  peakRainStation: string | null;
  peakRainfall: number;
  twoHourWindow: string | null;
  topRegion: BroadRegion | null;
  topRegionPenalty: number;
  topRegionForecast: string | null;
  twentyFourGeneralForecast: string | null;
  twentyFourPeriodLabel: string | null;
  temperatureRange: string | null;
  updatedLabel: string | null;
}

export interface RecommendedAction {
  station: FireStation;
  predictedResponseTime: number;
  reason: string;
  confidence: number;
  coverageImpact: string;
}

export type SourceMode = "live" | "loading" | "mock" | "error" | "stale";

export interface SourceStatus {
  label: string;
  mode: SourceMode;
  updatedLabel?: string;
}

export type TrafficCameraSnapshot = {
  cameraId: string;
  latitude: number;
  longitude: number;
  imageLink: string;
};

export type UrbanBuildingContext = {
  id: string;
  name?: string | null;
  buildingType?: "Residential" | "Commercial" | "Industrial" | "Mixed Use" | "Unknown" | string | null;
  heightCategory: "Low" | "Medium" | "High" | "Unknown";
  estimatedHeight: number;
  coordinates: [number, number][];
  distanceFromIncidentMeters: number;
  isLikelyIncidentBuilding: boolean;
};

export type URABuildingContextResponse = {
  source: string;
  incident: {
    latitude: number;
    longitude: number;
  };
  radius: number;
  isFallback: boolean;
  buildings: UrbanBuildingContext[];
};

export interface LatLng {
  lat: number;
  lng: number;
}

export type OneMapRouteMode = "drive" | "walk" | "cycle";

export interface OneMapRouteSummary {
  startPoint: string;
  endPoint: string;
  totalTimeSeconds: number;
  totalDistanceMeters: number;
}

export interface OneMapRouteData {
  mode: OneMapRouteMode;
  summary: OneMapRouteSummary;
  path: LatLng[];
  instructionCount: number;
  fetchedAt: number;
}

export interface TrafficLink {
  LinkID: string;
  Date: string;
  HourOfDate: string;
  Volume: string;
  StartLon: string;
  StartLat: string;
  EndLon: string;
  EndLat: string;
  RoadName: string;
  RoadCat: string;
}
