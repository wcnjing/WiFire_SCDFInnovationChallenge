# RZTB Mapper — SCDF Emergency Response Coverage Intelligence

A Next.js / React / TypeScript dashboard for visualising Singapore Civil Defence Force emergency response coverage, AI-predicted degradation, and effective response times.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and add your Mapbox token (optional — SVG fallback works without it)
cp .env.local.example .env.local

# 3. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| UI | React 18, TypeScript, TailwindCSS |
| Animation | Framer Motion 11 |
| Maps | SVG fallback (Mapbox GL ready) |
| Icons | Lucide React |

## Project Structure

```
src/
├── app/            # Next.js App Router (layout, page, globals.css)
├── components/
│   ├── map/        # SingaporeMap (SVG), MapOverlays
│   ├── panels/     # Left/Right panels & sub-components
│   ├── ui/         # TopBar, PanelToggle
│   └── dashboard/  # KPICard grid
├── data/           # Mock data (16 stations, incidents, AI insights)
├── hooks/          # useAppState (state mgmt), useLiveTick (clock)
├── lib/            # Coverage math, utilities
└── types/          # TypeScript interfaces
```

## Features

- **View 1 — Live Coverage Surface**: Isochrone overlays, station status, AI degradation prediction
- **View 2 — Effective Response Time**: Incident-type filtering, per-region response analysis
- **Time Slider**: Now / +15m / +30m / +60m AI prediction windows
- **Dashboard KPIs**: Overall health, avg response time, active incidents, coverage %
- **AI Insights Feed**: Severity-coded predictive alerts
- **Community Responder Zones**: Volunteer coverage overlay

## Next Steps

- Integrate Mapbox GL JS for real vector tile maps
- Connect to live SCDF API endpoints
- Add WebSocket for real-time incident streaming
- Build API routes under `src/app/api/`
# WiFire_SCDFInnovationChallenge
