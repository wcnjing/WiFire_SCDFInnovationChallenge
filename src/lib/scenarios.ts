import type { IncidentFilter, ScenarioPreset, TimeOffset } from "@/types";

export interface ScenarioConfig {
  id: ScenarioPreset;
  label: string;
  brief: string;
  timeOffset: TimeOffset;
  showTraffic: boolean;
  showWeather: boolean;
  showIncidents: boolean;
  incidentType: IncidentFilter;
  extraDelay: number;
  confidenceModifier: number;
}

export const SCENARIO_ORDER: ScenarioPreset[] = [
  "normal",
  "morning-peak",
  "heavy-rain",
  "pie-accident",
  "major-event",
];

export const SCENARIO_CONFIGS: Record<ScenarioPreset, ScenarioConfig> = {
  normal: {
    id: "normal",
    label: "Normal",
    brief: "Balanced baseline with all stations operating inside nominal conditions.",
    timeOffset: 0,
    showTraffic: true,
    showWeather: false,
    showIncidents: true,
    incidentType: "all",
    extraDelay: 0,
    confidenceModifier: 4,
  },
  "morning-peak": {
    id: "morning-peak",
    label: "Morning Peak",
    brief: "Traffic drag builds along citybound corridors and central relief routes.",
    timeOffset: 15,
    showTraffic: true,
    showWeather: false,
    showIncidents: true,
    incidentType: "all",
    extraDelay: 0.8,
    confidenceModifier: 0,
  },
  "heavy-rain": {
    id: "heavy-rain",
    label: "Heavy Rain",
    brief: "Wet-weather penalties increase travel variability and reduce road confidence.",
    timeOffset: 15,
    showTraffic: true,
    showWeather: true,
    showIncidents: true,
    incidentType: "medical",
    extraDelay: 1.2,
    confidenceModifier: -5,
  },
  "pie-accident": {
    id: "pie-accident",
    label: "PIE Accident",
    brief: "A major PIE disruption pressures central and western support corridors.",
    timeOffset: 30,
    showTraffic: true,
    showWeather: false,
    showIncidents: true,
    incidentType: "fire",
    extraDelay: 1.6,
    confidenceModifier: -3,
  },
  "major-event": {
    id: "major-event",
    label: "Major Event",
    brief: "Crowd surge and layered incidents compress coverage slack across sectors.",
    timeOffset: 60,
    showTraffic: true,
    showWeather: true,
    showIncidents: true,
    incidentType: "all",
    extraDelay: 2.1,
    confidenceModifier: -8,
  },
};
