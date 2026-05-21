"use client";
import { useState, useMemo } from "react";
import type { FireStation, Incident, ViewMode, TimeOffset } from "@/types";
import { VOLUNTEER_ZONES } from "@/data/mock";
import { getCoverageColors, getAdjustedResponseTime } from "@/lib/coverage";
import type { LTAIncident, LTASpeedBand } from "@/hooks/useLTAData";
import type { NEAStation, NEAForecast } from "@/hooks/useNEAWeather";
import { forecastSeverity } from "@/hooks/useNEAWeather";

interface Props {
  stations: FireStation[];
  incidents: Incident[];
  selectedStation: FireStation | null;
  onStationClick: (s: FireStation) => void;
  timeOffset: TimeOffset;
  activeView: ViewMode;
  showTraffic: boolean;
  showWeather: boolean;
  showIncidents: boolean;
  ltaIncidents?: LTAIncident[];
  ltaSpeedBands?: LTASpeedBand[];
  neaStations?: NEAStation[];
  neaForecasts?: NEAForecast[];
  stationWeatherPenalties?: Partial<Record<number, number>>;
}

function toSVG(lat: number, lng: number) {
  const x = ((lng - 103.59) / (104.05 - 103.59)) * 1000;
  const y = ((1.47 - lat) / (1.47 - 1.21)) * 600;
  return { x, y };
}

function speedBandColor(band: number): string {
  if (band <= 2) return "#dc2626"; // <10 km/h — heavy congestion
  if (band <= 4) return "#f97316"; // 10-29 km/h — moderate
  if (band <= 6) return "#eab308"; // 30-49 km/h — light
  return "#22c55e";                // 50+ km/h — free flow
}

function isPrimaryRoadCategory(category: string | number): boolean {
  const numericCategory = typeof category === "number" ? category : Number(category);
  if (Number.isFinite(numericCategory)) return numericCategory <= 4;
  return category <= "C";
}

/* ── Simplified but recognisable Singapore outline ── */
const SG_MAINLAND =
  "M 65,310 Q 55,285 60,260 Q 68,235 95,220 Q 115,210 140,195 " +
  "Q 165,180 200,170 Q 230,162 260,158 Q 290,154 320,148 " +
  "Q 350,138 380,130 Q 410,122 445,118 Q 480,114 510,112 " +
  "Q 545,110 580,112 Q 615,115 650,120 Q 680,126 710,135 " +
  "Q 740,145 770,155 Q 800,168 830,185 Q 855,198 875,215 " +
  "Q 895,232 910,255 Q 920,272 925,290 Q 930,310 928,330 " +
  "Q 924,350 915,368 Q 905,385 890,398 Q 870,412 848,422 " +
  "Q 825,430 800,435 Q 770,442 738,445 Q 705,448 670,448 " +
  "Q 635,448 600,445 Q 565,442 530,438 Q 495,435 460,432 " +
  "Q 425,430 390,430 Q 355,432 320,435 Q 285,440 250,445 " +
  "Q 215,448 180,445 Q 150,440 125,430 Q 102,420 85,405 " +
  "Q 70,390 62,370 Q 56,350 55,330 Q 56,320 65,310 Z";

const JURONG_ISLAND =
  "M 72,420 Q 85,410 110,408 Q 135,406 155,412 Q 170,418 165,428 " +
  "Q 158,438 135,440 Q 110,442 90,438 Q 75,432 72,420 Z";

const SENTOSA =
  "M 300,460 Q 320,452 345,450 Q 370,449 390,454 Q 400,460 395,468 " +
  "Q 385,475 360,477 Q 335,478 315,472 Q 302,466 300,460 Z";

const PULAU_UBIN =
  "M 830,145 Q 845,138 865,136 Q 885,135 900,140 Q 910,146 905,154 " +
  "Q 898,162 878,164 Q 858,165 842,158 Q 832,152 830,145 Z";

const PULAU_TEKONG =
  "M 910,160 Q 930,148 955,145 Q 975,144 990,150 Q 998,158 992,168 " +
  "Q 982,178 960,180 Q 938,181 922,174 Q 912,168 910,160 Z";

/* Major road network (simplified) */
const ROADS = [
  // PIE (Pan Island Expressway) — roughly east-west through middle
  "M 80,340 Q 200,300 350,280 Q 500,260 650,250 Q 780,240 900,260",
  // CTE (Central Expressway) — north-south through center
  "M 480,120 Q 470,200 465,280 Q 460,350 455,430",
  // ECP (East Coast Parkway) — along south coast
  "M 300,440 Q 450,420 600,410 Q 750,400 880,380",
  // AYE (Ayer Rajah Expressway) — south-west corridor
  "M 80,390 Q 180,380 280,370 Q 380,360 460,360",
  // SLE (Seletar Expressway) — northern east-west
  "M 250,170 Q 400,155 550,150 Q 700,148 820,165",
  // BKE (Bukit Timah Expressway) — northwest diagonal
  "M 200,190 Q 300,240 400,280 Q 440,300 460,340",
  // TPE (Tampines Expressway) — northeast corridor
  "M 550,140 Q 620,160 700,190 Q 780,220 850,250",
  // KPE (Kallang-Paya Lebar Expressway) — central-east
  "M 465,280 Q 530,300 600,320 Q 700,340 800,350",
];

export default function SingaporeMap({
  stations,
  incidents,
  selectedStation,
  onStationClick,
  timeOffset,
  activeView,
  showTraffic,
  showWeather,
  showIncidents,
  ltaIncidents,
  ltaSpeedBands,
  neaStations,
  neaForecasts,
  stationWeatherPenalties = {},
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const sPos = useMemo(() => stations.map((s) => ({ ...s, ...toSVG(s.lat, s.lng) })), [stations]);
  const iPos = useMemo(() => incidents.map((i) => ({ ...i, ...toSVG(i.lat, i.lng) })), [incidents]);
  const vPos = useMemo(() => VOLUNTEER_ZONES.map((v) => ({ ...v, ...toSVG(v.lat, v.lng) })), []);

  const getR = (s: FireStation) => {
    const base = activeView === "coverage" ? 55 : 40;
    const f = s.risk === "high" ? 0.18 : s.risk === "medium" ? 0.10 : 0.03;
    return Math.max(base - timeOffset * f * 10, 20);
  };

  return (
    <svg viewBox="0 0 1000 600" className="w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ background: "#f8fafc" }}>
      <defs>
        <filter id="glow"><feGaussianBlur stdDeviation="2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="softShadow"><feDropShadow dx="0" dy="1.5" stdDeviation="2" floodOpacity="0.15"/></filter>
        <filter id="landShadow"><feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1"/></filter>
        {/* Water pattern */}
        <pattern id="waterPattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="#e8f4fd"/>
          <path d="M0,10 Q5,8 10,10 Q15,12 20,10" stroke="#d4ecf9" strokeWidth="0.5" fill="none"/>
        </pattern>
        {/* Grid pattern */}
        <pattern id="gridPattern" width="50" height="50" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f1f5f9" strokeWidth="0.5"/>
        </pattern>
        {/* Weather gradients */}
        <radialGradient id="rainGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.55"/>
          <stop offset="60%" stopColor="#60a5fa" stopOpacity="0.30"/>
          <stop offset="100%" stopColor="#93c5fd" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="heavyRain" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1e40af" stopOpacity="0.65"/>
          <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.40"/>
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0"/>
        </radialGradient>
      </defs>

      {/* Sea / background */}
      <rect width="1000" height="600" fill="url(#waterPattern)"/>
      <rect width="1000" height="600" fill="url(#gridPattern)" opacity="0.4"/>

      {/* Johor (Malaysia) — top edge hint */}
      <rect x="0" y="-20" width="1000" height="80" fill="#eef2e8" stroke="#d1d9c6" strokeWidth="0.5"/>
      <text x="500" y="30" textAnchor="middle" fill="#b0b8a4" fontSize="11" fontFamily="sans-serif" letterSpacing="4">JOHOR, MALAYSIA</text>

      {/* Straits of Johor label */}
      <text x="500" y="95" textAnchor="middle" fill="#a8c8dc" fontSize="9" fontFamily="sans-serif" fontStyle="italic" letterSpacing="6" opacity="0.6">STRAITS OF JOHOR</text>

      {/* Singapore Strait label */}
      <text x="500" y="540" textAnchor="middle" fill="#a8c8dc" fontSize="9" fontFamily="sans-serif" fontStyle="italic" letterSpacing="6" opacity="0.6">SINGAPORE STRAIT</text>

      {/* ──── ISLANDS ──── */}
      <path d={JURONG_ISLAND} fill="#eef2e8" stroke="#c8d0bd" strokeWidth="0.8" filter="url(#landShadow)"/>
      <text x="120" y="425" textAnchor="middle" fill="#8a9178" fontSize="6" fontFamily="sans-serif" letterSpacing="1">JURONG ISLAND</text>

      <path d={SENTOSA} fill="#eef2e8" stroke="#c8d0bd" strokeWidth="0.8" filter="url(#landShadow)"/>
      <text x="348" y="468" textAnchor="middle" fill="#8a9178" fontSize="5.5" fontFamily="sans-serif" letterSpacing="1">SENTOSA</text>

      <path d={PULAU_UBIN} fill="#eef2e8" stroke="#c8d0bd" strokeWidth="0.8" filter="url(#landShadow)"/>
      <text x="868" y="153" textAnchor="middle" fill="#8a9178" fontSize="5.5" fontFamily="sans-serif" letterSpacing="1">P. UBIN</text>

      <path d={PULAU_TEKONG} fill="#eef2e8" stroke="#c8d0bd" strokeWidth="0.8" filter="url(#landShadow)"/>
      <text x="955" y="166" textAnchor="middle" fill="#8a9178" fontSize="5.5" fontFamily="sans-serif" letterSpacing="1">P. TEKONG</text>

      {/* ──── MAINLAND ──── */}
      <path d={SG_MAINLAND} fill="#f1f5f0" stroke="#b8c4a8" strokeWidth="1" filter="url(#landShadow)"/>

      {/* Internal region boundaries (light dashed) */}
      <path d="M 460,120 L 460,430" stroke="#d4dbc8" strokeWidth="0.5" strokeDasharray="4,3"/>
      <path d="M 300,150 L 300,445" stroke="#d4dbc8" strokeWidth="0.5" strokeDasharray="4,3"/>
      <path d="M 650,120 L 650,448" stroke="#d4dbc8" strokeWidth="0.5" strokeDasharray="4,3"/>
      <path d="M 80,300 L 928,300" stroke="#d4dbc8" strokeWidth="0.5" strokeDasharray="4,3"/>

      {/* Region labels */}
      <text x="190" y="295" textAnchor="middle" fill="#a3b090" fontSize="10" fontFamily="sans-serif" letterSpacing="3" opacity="0.5">WEST</text>
      <text x="380" y="200" textAnchor="middle" fill="#a3b090" fontSize="10" fontFamily="sans-serif" letterSpacing="3" opacity="0.5">NORTH</text>
      <text x="460" y="330" textAnchor="middle" fill="#a3b090" fontSize="10" fontFamily="sans-serif" letterSpacing="3" opacity="0.5">CENTRAL</text>
      <text x="750" y="250" textAnchor="middle" fill="#a3b090" fontSize="10" fontFamily="sans-serif" letterSpacing="3" opacity="0.5">EAST</text>
      <text x="580" y="180" textAnchor="middle" fill="#a3b090" fontSize="8" fontFamily="sans-serif" letterSpacing="2" opacity="0.5">NORTH-EAST</text>

      {/* Reservoirs */}
      <ellipse cx="390" cy="210" rx="22" ry="10" fill="#d4ecf9" opacity="0.7" stroke="#b8d8ec" strokeWidth="0.5"/>
      <text x="390" y="213" textAnchor="middle" fill="#8ab4cc" fontSize="4.5">Seletar Reservoir</text>
      <ellipse cx="320" cy="250" rx="18" ry="8" fill="#d4ecf9" opacity="0.6" stroke="#b8d8ec" strokeWidth="0.5"/>
      <text x="320" y="253" textAnchor="middle" fill="#8ab4cc" fontSize="4.5">MacRitchie</text>
      <ellipse cx="480" cy="230" rx="15" ry="7" fill="#d4ecf9" opacity="0.5" stroke="#b8d8ec" strokeWidth="0.5"/>
      <text x="480" y="233" textAnchor="middle" fill="#8ab4cc" fontSize="4">Bedok Res.</text>

      {/* Marina Bay */}
      <ellipse cx="440" cy="395" rx="20" ry="12" fill="#d4ecf9" opacity="0.6" stroke="#b8d8ec" strokeWidth="0.5"/>
      <text x="440" y="398" textAnchor="middle" fill="#8ab4cc" fontSize="4.5">Marina Bay</text>

      {/* ──── ROADS ──── */}
      {ROADS.map((d, i) => (
        <path key={`road-${i}`} d={d} fill="none" stroke="#dfe4d8" strokeWidth={i < 3 ? "2" : "1.2"} strokeLinecap="round"/>
      ))}
      {/* Road labels */}
      <text x="500" y="268" fill="#b0b8a4" fontSize="5" fontFamily="monospace" opacity="0.6">PIE</text>
      <text x="472" y="200" fill="#b0b8a4" fontSize="5" fontFamily="monospace" opacity="0.6">CTE</text>
      <text x="600" y="415" fill="#b0b8a4" fontSize="5" fontFamily="monospace" opacity="0.6">ECP</text>
      <text x="200" y="385" fill="#b0b8a4" fontSize="5" fontFamily="monospace" opacity="0.6">AYE</text>

      {/* ──── TRAFFIC OVERLAY ──── */}
      {showTraffic && (
        <g opacity={0.85}>
          {ltaSpeedBands && ltaSpeedBands.length > 0 ? (
            ltaSpeedBands
              .filter((b: LTASpeedBand) => b.SpeedBand <= 5 && isPrimaryRoadCategory(b.RoadCategory))
              .map((b: LTASpeedBand) => {
                const a = toSVG(parseFloat(b.StartLat), parseFloat(b.StartLon));
                const c = toSVG(parseFloat(b.EndLat), parseFloat(b.EndLon));
                return (
                  <line key={b.LinkID}
                    x1={a.x} y1={a.y} x2={c.x} y2={c.y}
                    stroke={speedBandColor(b.SpeedBand)}
                    strokeWidth={b.SpeedBand <= 2 ? 4 : 2.5}
                    strokeLinecap="round"
                    opacity={0.7 + timeOffset * 0.02}
                  />
                );
              })
          ) : (
            <>
              <path d="M 300,280 Q 420,265 550,258" stroke="#ef4444" strokeWidth="5" fill="none" opacity={0.25 + timeOffset * 0.06} strokeLinecap="round"/>
              <path d="M 468,180 Q 464,240 462,300" stroke="#f59e0b" strokeWidth="4" fill="none" opacity={0.20 + timeOffset * 0.05} strokeLinecap="round"/>
              <path d="M 120,385 Q 220,378 320,372" stroke="#f59e0b" strokeWidth="3.5" fill="none" opacity={0.18 + timeOffset * 0.04} strokeLinecap="round"/>
              <path d="M 600,170 Q 680,200 760,230" stroke="#eab308" strokeWidth="3" fill="none" opacity={0.15 + timeOffset * 0.04} strokeLinecap="round"/>
            </>
          )}
        </g>
      )}

      {/* ──── WEATHER OVERLAY (Live NEA data) ──── */}
      {showWeather && (
        <g>
          {/* Forecast region bubbles — coloured by severity */}
          {neaForecasts?.map((f, i) => {
            const p = toSVG(f.lat, f.lng);
            const sev = forecastSeverity(f.forecast);
            const colors: Record<string, { main: string; mid: string }> = {
              storm:  { main: "#1e40af", mid: "#3b82f6" },
              heavy:  { main: "#2563eb", mid: "#60a5fa" },
              light:  { main: "#60a5fa", mid: "#93c5fd" },
              cloudy: { main: "#94a3b8", mid: "#cbd5e1" },
              clear:  { main: "#fbbf24", mid: "#fde68a" },
            };
            const c = colors[sev];
            const radius = sev === "storm" ? 70 : sev === "heavy" ? 55 : sev === "light" ? 40 : 30;
            const opacity = sev === "storm" ? 0.55 : sev === "heavy" ? 0.45 : sev === "light" ? 0.30 : 0.15;
            return (
              <g key={`fc-${i}`}>
                <defs>
                  <radialGradient id={`fcGrad-${i}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor={c.main} stopOpacity={opacity}/>
                    <stop offset="70%"  stopColor={c.mid}  stopOpacity={opacity * 0.5}/>
                    <stop offset="100%" stopColor={c.mid}  stopOpacity="0"/>
                  </radialGradient>
                </defs>
                <circle cx={p.x} cy={p.y} r={radius} fill={`url(#fcGrad-${i})`}/>
                {sev === "storm" && (
                  <path d={`M ${p.x + 3},${p.y - 8} L ${p.x - 4},${p.y + 4} L ${p.x + 2},${p.y + 4} L ${p.x - 3},${p.y + 14}`}
                    stroke="#fbbf24" strokeWidth="2" fill="none" opacity="0.9">
                    <animate attributeName="opacity" values="0.9;0.2;0.9" dur="2.5s" repeatCount="indefinite"/>
                  </path>
                )}
                <title>{f.area}: {f.forecast}</title>
              </g>
            );
          })}

          {/* Live rainfall stations — size & colour = current mm */}
          {neaStations?.filter(s => s.rainfall > 0).map(s => {
            const p = toSVG(s.lat, s.lng);
            const intensity = Math.min(s.rainfall / 5, 1); // 5mm/5min = downpour
            const r = 6 + intensity * 18;
            const fill = s.rainfall >= 3 ? "#1e40af" : s.rainfall >= 1 ? "#3b82f6" : "#60a5fa";
            return (
              <g key={`rain-${s.id}`}>
                <circle cx={p.x} cy={p.y} r={r} fill={fill} opacity={0.25 + intensity * 0.4}>
                  <animate attributeName="r" values={`${r};${r * 1.3};${r}`} dur="3s" repeatCount="indefinite"/>
                </circle>
                <circle cx={p.x} cy={p.y} r={3} fill={fill} opacity="0.95"/>
                <title>{s.name}: {s.rainfall.toFixed(1)} mm</title>
              </g>
            );
          })}

          {/* Live data badge */}
          <g transform="translate(630, 555)">
            <rect x="0" y="0" width="170" height="22" rx="3" fill="white" stroke="#3b82f6" strokeWidth="0.5" opacity="0.95"/>
            <circle cx="10" cy="11" r="3" fill="#22c55e">
              <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
            </circle>
            <text x="20" y="15" fill="#1e40af" fontSize="9" fontWeight="600">
              LIVE · NEA {neaStations?.length ?? 0} stations
            </text>
          </g>
        </g>
      )}

      {/* ──── COVERAGE ISOCHRONES ──── */}
      {sPos.map(s => {
        const r = getR(s);
        const c = getCoverageColors(s, timeOffset, stationWeatherPenalties[s.id] ?? 0);
        const sel = selectedStation?.id === s.id;
        return (
          <g key={`cov-${s.id}`}>
            <circle cx={s.x} cy={s.y} r={r * 1.5} fill={c.fill} opacity={sel ? 0.35 : 0.12}/>
            <circle cx={s.x} cy={s.y} r={r} fill={c.fill} opacity={sel ? 0.5 : 0.22} stroke={c.stroke} strokeWidth={sel ? 1.5 : 0.8} strokeDasharray="6,3"/>
            <circle cx={s.x} cy={s.y} r={r * 0.5} fill={c.fill} opacity={sel ? 0.45 : 0.28}/>
          </g>
        );
      })}

      {/* ──── VOLUNTEER HEATMAP (View 2) ──── */}
      {activeView === "response" && vPos.map(v => (
        <circle key={`vol-${v.id}`} cx={v.x} cy={v.y} r={v.density / 2.2} fill="#8b5cf6" opacity={v.responseProbability * 0.35}/>
      ))}

      {/* ──── MOCK INCIDENTS ──── */}
      {showIncidents && iPos.map(inc => (
        <g key={`inc-${inc.id}`}>
          <circle cx={inc.x} cy={inc.y} r="10" fill={inc.type === "fire" ? "#ef4444" : "#f59e0b"} opacity="0.25">
            <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.25;0.05;0.25" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx={inc.x} cy={inc.y} r="5" fill={inc.type === "fire" ? "#ef4444" : "#f59e0b"} filter="url(#glow)"/>
          <text x={inc.x} y={inc.y + 2} textAnchor="middle" fontSize="6">{inc.type === "fire" ? "🔥" : "🏥"}</text>
        </g>
      ))}

      {/* ──── LIVE LTA TRAFFIC INCIDENTS ──── */}
      {showIncidents && ltaIncidents?.map((inc: LTAIncident, i: number) => {
        const p = toSVG(inc.Latitude, inc.Longitude);
        return (
          <g key={`lta-${i}`}>
            <rect
              x={p.x - 4} y={p.y - 4} width="8" height="8"
              fill="#7c3aed" stroke="white" strokeWidth="1.5"
              transform={`rotate(45 ${p.x} ${p.y})`}
            />
            <title>{inc.Type}: {inc.Message}</title>
          </g>
        );
      })}

      {/* ──── STATION MARKERS ──── */}
      {sPos.map(s => {
        const sel = selectedStation?.id === s.id;
        const hov = hovered === s.id;
        const adj = getAdjustedResponseTime(s, timeOffset, stationWeatherPenalties[s.id] ?? 0);
        return (
          <g key={`stn-${s.id}`} className="cursor-pointer"
            onMouseEnter={() => setHovered(s.id)} onMouseLeave={() => setHovered(null)}
            onClick={() => onStationClick(s)}>
            {/* Outer ring for selected */}
            {sel && <circle cx={s.x} cy={s.y} r="16" fill="none" stroke="#1e40af" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.5"/>}
            {/* Main dot */}
            <circle cx={s.x} cy={s.y} r={sel ? 11 : hov ? 9 : 7}
              fill={sel ? "#1e40af" : "#1d4ed8"} stroke="white" strokeWidth="2" filter="url(#glow)"/>
            {/* Station number */}
            <text x={s.x} y={s.y + 3} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="monospace">{s.id}</text>
            {/* Tooltip */}
            {(hov || sel) && (
              <g filter="url(#softShadow)">
                <rect x={s.x + 15} y={s.y - 28} width="165" height="48" rx="4" fill="white" stroke="#e2e8f0" strokeWidth="0.8"/>
                <text x={s.x + 22} y={s.y - 13} fill="#0f172a" fontSize="8.5" fontWeight="600">{s.name}</text>
                <text x={s.x + 22} y={s.y - 2} fill="#64748b" fontSize="6.5">Avg: {adj.toFixed(1)} min · Units: {s.units}</text>
                <text x={s.x + 22} y={s.y + 10} fill={s.readiness >= 85 ? "#16a34a" : s.readiness >= 75 ? "#d97706" : "#dc2626"} fontSize="6.5" fontWeight="500">
                  Readiness: {s.readiness}% · Risk: {s.risk}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* ──── CHANGI AIRPORT ──── */}
      <g transform="translate(885, 300)">
        <rect x="-18" y="-6" width="36" height="12" rx="2" fill="#e8ece3" stroke="#c8d0bd" strokeWidth="0.5"/>
        <text x="0" y="2" textAnchor="middle" fill="#8a9178" fontSize="5">✈ CHANGI</text>
      </g>

      {/* ──── SCALE BAR ──── */}
      <g transform="translate(30, 565)">
        <line x1="0" y1="0" x2="108" y2="0" stroke="#94a3b8" strokeWidth="1"/>
        <line x1="0" y1="-4" x2="0" y2="4" stroke="#94a3b8" strokeWidth="1"/>
        <line x1="54" y1="-3" x2="54" y2="3" stroke="#94a3b8" strokeWidth="0.5"/>
        <line x1="108" y1="-4" x2="108" y2="4" stroke="#94a3b8" strokeWidth="1"/>
        <text x="0" y="12" fill="#94a3b8" fontSize="7">0</text>
        <text x="54" y="12" textAnchor="middle" fill="#94a3b8" fontSize="7">5 km</text>
        <text x="108" y="12" textAnchor="middle" fill="#94a3b8" fontSize="7">10 km</text>
      </g>

      {/* ──── NORTH ARROW ──── */}
      <g transform="translate(960, 45)">
        <circle cx="0" cy="0" r="14" fill="white" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.9"/>
        <text x="0" y="-2" fill="#64748b" fontSize="10" fontWeight="700" textAnchor="middle">N</text>
        <polygon points="-3,6 0,-1 3,6" fill="#94a3b8"/>
        <line x1="0" y1="6" x2="0" y2="11" stroke="#94a3b8" strokeWidth="0.8"/>
      </g>
    </svg>
  );
}
