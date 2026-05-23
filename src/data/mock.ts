import type { FireStation, Incident, AIInsight, Region, VolunteerZone, TrafficLink } from "@/types";

export const FIRE_STATIONS: FireStation[] = [
  { id: 1, name: "Central Fire Station", lat: 1.2966, lng: 103.8483, readiness: 95, avgResponse: 6.2, units: 4, coverage: "Central", risk: "low" },
  { id: 2, name: "Alexandra Fire Station", lat: 1.2873, lng: 103.8065, readiness: 88, avgResponse: 7.1, units: 3, coverage: "South-West", risk: "medium" },
  { id: 3, name: "Paya Lebar Fire Station", lat: 1.3284, lng: 103.8935, readiness: 92, avgResponse: 6.8, units: 3, coverage: "East", risk: "low" },
  { id: 4, name: "Ang Mo Kio Fire Station", lat: 1.3691, lng: 103.8454, readiness: 90, avgResponse: 7.4, units: 4, coverage: "North", risk: "low" },
  { id: 5, name: "Jurong Fire Station", lat: 1.3394, lng: 103.707, readiness: 78, avgResponse: 8.9, units: 3, coverage: "West", risk: "high" },
  { id: 6, name: "Tampines Fire Station", lat: 1.3496, lng: 103.9568, readiness: 91, avgResponse: 7.0, units: 3, coverage: "East", risk: "low" },
  { id: 7, name: "Bishan Fire Station", lat: 1.3526, lng: 103.8352, readiness: 93, avgResponse: 6.5, units: 4, coverage: "Central", risk: "low" },
  { id: 8, name: "Changi Fire Station", lat: 1.3644, lng: 103.9915, readiness: 85, avgResponse: 8.2, units: 2, coverage: "East", risk: "medium" },
  { id: 9, name: "Clementi Fire Station", lat: 1.3162, lng: 103.7649, readiness: 87, avgResponse: 7.6, units: 3, coverage: "West", risk: "medium" },
  { id: 10, name: "Woodlands Fire Station", lat: 1.4382, lng: 103.7891, readiness: 82, avgResponse: 8.5, units: 3, coverage: "North", risk: "high" },
  { id: 11, name: "Yishun Fire Station", lat: 1.4304, lng: 103.8354, readiness: 86, avgResponse: 7.8, units: 3, coverage: "North", risk: "medium" },
  { id: 12, name: "Sengkang Fire Station", lat: 1.3868, lng: 103.8914, readiness: 89, avgResponse: 7.2, units: 3, coverage: "North-East", risk: "low" },
  { id: 13, name: "Bukit Batok Fire Station", lat: 1.359, lng: 103.7637, readiness: 84, avgResponse: 8.0, units: 3, coverage: "West", risk: "medium" },
  { id: 14, name: "Marine Parade Fire Station", lat: 1.303, lng: 103.906, readiness: 91, avgResponse: 6.9, units: 3, coverage: "South-East", risk: "low" },
  { id: 15, name: "Tuas Fire Station", lat: 1.32, lng: 103.64, readiness: 72, avgResponse: 9.8, units: 2, coverage: "Far West", risk: "high" },
  { id: 16, name: "Punggol Fire Station", lat: 1.405, lng: 103.91, readiness: 88, avgResponse: 7.5, units: 3, coverage: "North-East", risk: "low" },
];

export const INCIDENTS: Incident[] = [
  { id: 1, type: "fire", lat: 1.3521, lng: 103.8198, severity: "high", status: "active", desc: "Structure Fire - Orchard Rd", timestamp: "14:32" },
  { id: 2, type: "medical", lat: 1.3, lng: 103.86, severity: "medium", status: "active", desc: "Cardiac Arrest - Marine Parade", timestamp: "14:28" },
  { id: 3, type: "medical", lat: 1.42, lng: 103.835, severity: "low", status: "responding", desc: "Fall Injury - Yishun", timestamp: "14:15" },
  { id: 4, type: "fire", lat: 1.335, lng: 103.71, severity: "medium", status: "responding", desc: "Vehicle Fire - Jurong East", timestamp: "14:10" },
  { id: 5, type: "medical", lat: 1.37, lng: 103.85, severity: "high", status: "active", desc: "Breathing Difficulty - Bishan", timestamp: "14:05" },
  { id: 6, type: "medical", lat: 1.345, lng: 103.94, severity: "medium", status: "responding", desc: "Chest Pain - Tampines", timestamp: "13:58" },
  { id: 7, type: "fire", lat: 1.438, lng: 103.785, severity: "low", status: "responding", desc: "Minor Fire - Woodlands", timestamp: "13:45" },
];

export const AI_INSIGHTS: AIInsight[] = [
  {
    id: 1,
    severity: "warning",
    region: "Central",
    time: "2 min ago",
    text: "PIE eastbound congestion expected to increase by 32% in the next 30 minutes and affect Central corridors.",
    prediction: "PIE eastbound will slow across Orchard to Bishan access corridors.",
    impact: "Central and Bishan appliances may see 1.0 to 1.4 min delay.",
    action: "Stage one reserve pump in the Bukit Timah corridor and keep traffic overlay active.",
    confidence: 91,
  },
  {
    id: 2,
    severity: "critical",
    region: "Central",
    time: "5 min ago",
    text: "Coverage degradation predicted in Central Region due to congestion buildup.",
    prediction: "Central fire coverage may slip below the 8-minute target within 30 minutes.",
    impact: "Command headroom drops for Orchard, Novena, and River Valley sectors.",
    action: "Pre-position Alexandra or Bishan support resources before the peak forms.",
    confidence: 88,
  },
  {
    id: 3,
    severity: "info",
    region: "South",
    time: "8 min ago",
    text: "Suggested standby repositioning for southern coverage continuity.",
    prediction: "Southern shoreline demand remains stable but inland spillover risk is rising.",
    impact: "A standby move preserves overlap for Bukit Merah and HarbourFront sectors.",
    action: "Shift Alexandra Fire Station standby coverage toward Bukit Merah.",
    confidence: 84,
  },
  {
    id: 4,
    severity: "warning",
    region: "Central",
    time: "12 min ago",
    text: "Bukit Timah coverage expected to soften later in the operational window.",
    prediction: "Bukit Timah may fall below the 8-minute fire response target in 45 minutes.",
    impact: "Western-central overlap becomes thinner during late-peak congestion.",
    action: "Hold a mobile unit closer to Dunearn and PIE feeder routes.",
    confidence: 79,
  },
  {
    id: 5,
    severity: "info",
    region: "East",
    time: "15 min ago",
    text: "Rainfall is likely to slow eastern corridor movement.",
    prediction: "Paya Lebar, Tampines, and Changi routes could add 1.2 minutes.",
    impact: "EMS arrival variability increases across eastern arterial roads.",
    action: "Keep Eastern stations on wet-weather watch and favor expressway routing where possible.",
    confidence: 82,
  },
  {
    id: 6,
    severity: "critical",
    region: "West",
    time: "18 min ago",
    text: "Tuas industrial zone risk is elevated during scheduled maintenance activity.",
    prediction: "Concurrent incident probability is above baseline for the next hour.",
    impact: "Jurong and Tuas coverage reserves could be consumed by a second call.",
    action: "Issue a pre-position advisory for western industrial response assets.",
    confidence: 86,
  },
  {
    id: 7,
    severity: "info",
    region: "North-East",
    time: "22 min ago",
    text: "Volunteer density improved after a myResponder notification.",
    prediction: "Community response support is stronger in Sengkang this window.",
    impact: "Cardiac response time improves to about 4.2 minutes in dense blocks.",
    action: "Use the volunteer lift as cover while keeping station crews on primary fire tasks.",
    confidence: 76,
  },
  {
    id: 8,
    severity: "warning",
    region: "North",
    time: "25 min ago",
    text: "CTE northbound speed is degrading across north-central access routes.",
    prediction: "Ang Mo Kio and Bishan units may add 1.5 minutes by 15:30.",
    impact: "North-to-central handoff corridors become less reliable for surge support.",
    action: "Watch for spillover from AMK to Central and shift backups earlier if needed.",
    confidence: 83,
  },
];

export const REGIONS: Region[] = [
  { name: "Central", health: 94, stations: 3, avgResponse: 6.5, trend: "stable" },
  { name: "North", health: 82, stations: 3, avgResponse: 7.9, trend: "degrading" },
  { name: "East", health: 89, stations: 3, avgResponse: 7.3, trend: "stable" },
  { name: "West", health: 76, stations: 3, avgResponse: 8.5, trend: "degrading" },
  { name: "North-East", health: 87, stations: 2, avgResponse: 7.3, trend: "improving" },
  { name: "South", health: 91, stations: 2, avgResponse: 6.8, trend: "stable" },
];

export const VOLUNTEER_ZONES: VolunteerZone[] = [
  { id: 1, lat: 1.3, lng: 103.85, density: 85, aedCount: 42, responseProbability: 0.78 },
  { id: 2, lat: 1.35, lng: 103.84, density: 72, aedCount: 35, responseProbability: 0.65 },
  { id: 3, lat: 1.32, lng: 103.77, density: 55, aedCount: 18, responseProbability: 0.45 },
  { id: 4, lat: 1.38, lng: 103.89, density: 68, aedCount: 28, responseProbability: 0.6 },
  { id: 5, lat: 1.43, lng: 103.83, density: 40, aedCount: 12, responseProbability: 0.32 },
  { id: 6, lat: 1.34, lng: 103.95, density: 62, aedCount: 24, responseProbability: 0.55 },
  { id: 7, lat: 1.29, lng: 103.81, density: 78, aedCount: 38, responseProbability: 0.72 },
  { id: 8, lat: 1.36, lng: 103.76, density: 45, aedCount: 15, responseProbability: 0.38 },
];

export const AI_PREDICTIONS: Record<number, string> = {
  0: "All coverage zones within operational targets. Monitoring 3 congestion corridors across PIE, CTE, and AYE.",
  15: "PIE eastbound congestion building. Central coverage may degrade by 4%. Bishan station response time trending upward.",
  30: "Coverage degradation predicted in Central Region due to congestion buildup. Recommend standby repositioning for Alexandra and Clementi stations.",
  60: "Bukit Timah and Jurong coverage expected below the 8-minute target. Tuas industrial zone remains elevated risk. Pre-position advisory issued for 3 stations.",
};

export const AI_CONFIDENCE: Record<number, number> = { 0: 98, 15: 91, 30: 84, 60: 72 };

export const TRAFFIC_LINKS: TrafficLink[] = [];

export const RESPONSE_CORRIDOR_DEMO = [
  { roadName: "PIE", congestion: "High", delayMinutes: 1.9 },
  { roadName: "CTE", congestion: "High", delayMinutes: 1.5 },
  { roadName: "AYE", congestion: "Medium", delayMinutes: 1.1 },
  { roadName: "BKE", congestion: "Low", delayMinutes: 0.5 },
  { roadName: "TPE", congestion: "Medium", delayMinutes: 0.8 },
] as const;
