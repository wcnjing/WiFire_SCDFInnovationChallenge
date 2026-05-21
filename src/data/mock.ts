import type { FireStation, Incident, AIInsight, Region, VolunteerZone } from "@/types";

export const FIRE_STATIONS: FireStation[] = [
  { id: 1,  name: "Central Fire Station",       lat: 1.2966, lng: 103.8483, readiness: 95, avgResponse: 6.2, units: 4, coverage: "Central",    risk: "low" },
  { id: 2,  name: "Alexandra Fire Station",     lat: 1.2873, lng: 103.8065, readiness: 88, avgResponse: 7.1, units: 3, coverage: "South-West", risk: "medium" },
  { id: 3,  name: "Paya Lebar Fire Station",    lat: 1.3284, lng: 103.8935, readiness: 92, avgResponse: 6.8, units: 3, coverage: "East",       risk: "low" },
  { id: 4,  name: "Ang Mo Kio Fire Station",    lat: 1.3691, lng: 103.8454, readiness: 90, avgResponse: 7.4, units: 4, coverage: "North",      risk: "low" },
  { id: 5,  name: "Jurong Fire Station",        lat: 1.3394, lng: 103.7070, readiness: 78, avgResponse: 8.9, units: 3, coverage: "West",       risk: "high" },
  { id: 6,  name: "Tampines Fire Station",      lat: 1.3496, lng: 103.9568, readiness: 91, avgResponse: 7.0, units: 3, coverage: "East",       risk: "low" },
  { id: 7,  name: "Bishan Fire Station",        lat: 1.3526, lng: 103.8352, readiness: 93, avgResponse: 6.5, units: 4, coverage: "Central",    risk: "low" },
  { id: 8,  name: "Changi Fire Station",        lat: 1.3644, lng: 103.9915, readiness: 85, avgResponse: 8.2, units: 2, coverage: "East",       risk: "medium" },
  { id: 9,  name: "Clementi Fire Station",      lat: 1.3162, lng: 103.7649, readiness: 87, avgResponse: 7.6, units: 3, coverage: "West",       risk: "medium" },
  { id: 10, name: "Woodlands Fire Station",     lat: 1.4382, lng: 103.7891, readiness: 82, avgResponse: 8.5, units: 3, coverage: "North",      risk: "high" },
  { id: 11, name: "Yishun Fire Station",        lat: 1.4304, lng: 103.8354, readiness: 86, avgResponse: 7.8, units: 3, coverage: "North",      risk: "medium" },
  { id: 12, name: "Sengkang Fire Station",      lat: 1.3868, lng: 103.8914, readiness: 89, avgResponse: 7.2, units: 3, coverage: "North-East", risk: "low" },
  { id: 13, name: "Bukit Batok Fire Station",   lat: 1.3590, lng: 103.7637, readiness: 84, avgResponse: 8.0, units: 3, coverage: "West",       risk: "medium" },
  { id: 14, name: "Marine Parade Fire Station", lat: 1.3030, lng: 103.9060, readiness: 91, avgResponse: 6.9, units: 3, coverage: "South-East", risk: "low" },
  { id: 15, name: "Tuas Fire Station",          lat: 1.3200, lng: 103.6400, readiness: 72, avgResponse: 9.8, units: 2, coverage: "Far West",   risk: "high" },
  { id: 16, name: "Punggol Fire Station",       lat: 1.4050, lng: 103.9100, readiness: 88, avgResponse: 7.5, units: 3, coverage: "North-East", risk: "low" },
];

export const INCIDENTS: Incident[] = [
  { id: 1, type: "fire",    lat: 1.3521, lng: 103.8198, severity: "high",   status: "active",     desc: "Structure Fire — Orchard Rd",    timestamp: "14:32" },
  { id: 2, type: "medical", lat: 1.3000, lng: 103.8600, severity: "medium", status: "active",     desc: "Cardiac Arrest — Marine Parade", timestamp: "14:28" },
  { id: 3, type: "medical", lat: 1.4200, lng: 103.8350, severity: "low",    status: "responding", desc: "Fall Injury — Yishun",            timestamp: "14:15" },
  { id: 4, type: "fire",    lat: 1.3350, lng: 103.7100, severity: "medium", status: "responding", desc: "Vehicle Fire — Jurong East",      timestamp: "14:10" },
  { id: 5, type: "medical", lat: 1.3700, lng: 103.8500, severity: "high",   status: "active",     desc: "Breathing Difficulty — Bishan",   timestamp: "14:05" },
  { id: 6, type: "medical", lat: 1.3450, lng: 103.9400, severity: "medium", status: "responding", desc: "Chest Pain — Tampines",           timestamp: "13:58" },
  { id: 7, type: "fire",    lat: 1.4380, lng: 103.7850, severity: "low",    status: "responding", desc: "Minor Fire — Woodlands",          timestamp: "13:45" },
];

export const AI_INSIGHTS: AIInsight[] = [
  { id: 1, severity: "warning",  text: "PIE eastbound congestion expected to increase by 32% in next 30 min. Affects Central and Bishan coverage corridors.",                    time: "2 min ago",  region: "Central" },
  { id: 2, severity: "critical", text: "Coverage degradation predicted in Central Region in 30 minutes due to congestion buildup. Consider pre-positioning.",                     time: "5 min ago",  region: "Central" },
  { id: 3, severity: "info",     text: "Suggested standby repositioning: Alexandra Fire Station to Bukit Merah sector to maintain southern coverage.",                             time: "8 min ago",  region: "South" },
  { id: 4, severity: "warning",  text: "Bukit Timah coverage expected to fall below 8-min fire response target in 45 minutes.",                                                    time: "12 min ago", region: "Central" },
  { id: 5, severity: "info",     text: "Rainfall predicted in eastern corridor — response time adjustment +1.2 min for Paya Lebar, Tampines, and Changi stations.",                time: "15 min ago", region: "East" },
  { id: 6, severity: "critical", text: "Tuas industrial zone: concurrent incident risk elevated due to scheduled maintenance at Jurong Island. Pre-position advisory issued.",     time: "18 min ago", region: "West" },
  { id: 7, severity: "info",     text: "Sengkang volunteer density increased by 15% after myResponder alert. Effective cardiac response time improved to 4.2 min.",                time: "22 min ago", region: "North-East" },
  { id: 8, severity: "warning",  text: "CTE northbound speed degrading. Ang Mo Kio and Bishan stations may see +1.5 min response delay by 15:30.",                                time: "25 min ago", region: "North" },
];

export const REGIONS: Region[] = [
  { name: "Central",    health: 94, stations: 3, avgResponse: 6.5, trend: "stable" },
  { name: "North",      health: 82, stations: 3, avgResponse: 7.9, trend: "degrading" },
  { name: "East",       health: 89, stations: 3, avgResponse: 7.3, trend: "stable" },
  { name: "West",       health: 76, stations: 3, avgResponse: 8.5, trend: "degrading" },
  { name: "North-East", health: 87, stations: 2, avgResponse: 7.3, trend: "improving" },
  { name: "South",      health: 91, stations: 2, avgResponse: 6.8, trend: "stable" },
];

export const VOLUNTEER_ZONES: VolunteerZone[] = [
  { id: 1, lat: 1.3000, lng: 103.8500, density: 85, aedCount: 42, responseProbability: 0.78 },
  { id: 2, lat: 1.3500, lng: 103.8400, density: 72, aedCount: 35, responseProbability: 0.65 },
  { id: 3, lat: 1.3200, lng: 103.7700, density: 55, aedCount: 18, responseProbability: 0.45 },
  { id: 4, lat: 1.3800, lng: 103.8900, density: 68, aedCount: 28, responseProbability: 0.60 },
  { id: 5, lat: 1.4300, lng: 103.8300, density: 40, aedCount: 12, responseProbability: 0.32 },
  { id: 6, lat: 1.3400, lng: 103.9500, density: 62, aedCount: 24, responseProbability: 0.55 },
  { id: 7, lat: 1.2900, lng: 103.8100, density: 78, aedCount: 38, responseProbability: 0.72 },
  { id: 8, lat: 1.3600, lng: 103.7600, density: 45, aedCount: 15, responseProbability: 0.38 },
];

export const AI_PREDICTIONS: Record<number, string> = {
  0:  "All coverage zones within operational targets. Monitoring 3 congestion corridors across PIE, CTE, and AYE.",
  15: "PIE eastbound congestion building. Central coverage may degrade by 4%. Bishan station response time trending upward.",
  30: "Coverage degradation predicted in Central Region due to congestion buildup. Recommend standby repositioning for Alexandra and Clementi stations.",
  60: "⚠ Bukit Timah and Jurong coverage expected below 8-min target. Tuas industrial zone at elevated risk. Pre-position advisory issued for 3 stations.",
};

export const AI_CONFIDENCE: Record<number, number> = { 0: 98, 15: 91, 30: 84, 60: 72 };
