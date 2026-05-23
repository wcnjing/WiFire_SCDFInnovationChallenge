# RZTB Mapper - SCDF Emergency Response Coverage Intelligence

A Next.js / React / TypeScript dashboard for visualising Singapore Civil Defence Force emergency response coverage, live traffic impacts, weather disruptions, and route-aware response planning.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and add live API tokens as needed
cp .env.local.example .env.local

# 3. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

```env
LTA_API_KEY=your_lta_datamall_key_here
ONEMAP_API_TOKEN=your_onemap_access_token_here
```

`LTA_API_KEY` powers the live traffic overlays and expressway ETA cards. `ONEMAP_API_TOKEN` powers the route planner between a selected fire station and an active incident.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| UI | React 18, TypeScript, TailwindCSS |
| Animation | Framer Motion 11 |
| Maps | OneMap basemap with Leaflet, LTA overlays, and OneMap routing |
| Icons | Lucide React |

## Project Structure

```text
src/
|- app/            # Next.js App Router (layout, page, globals.css, API routes)
|- components/
|  |- map/         # SingaporeMap Leaflet basemap and overlays
|  |- panels/      # Left/right panels and routing widgets
|  |- ui/          # TopBar, PanelToggle
|  `- dashboard/   # KPI cards
|- data/           # Mock stations, incidents, insights
|- hooks/          # App state, live data, routing hooks
|- lib/            # Coverage math and utilities
`- types/          # Shared TypeScript interfaces
```

## Features

- Live LTA traffic incidents, speed bands, and expressway travel times
- OneMap route planner for drive, walk, and cycle modes
- Coverage and response-time operational views
- Weather-aware station penalties using live NEA feeds
- Incident filtering, KPI cards, and AI insight panels

## Notes

- The current base map is a live OneMap slippy map rendered with Leaflet.
- OneMap routing is integrated through server-side API routes so the token stays out of frontend code.
- If the OneMap token is missing or expired, the route planner will show an inline error state.
