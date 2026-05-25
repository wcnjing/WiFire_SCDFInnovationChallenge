# RZTB Mapper — Pre-submission Code Review

**Reviewer note on scope.** Reviewed end-to-end against the brief: every file under `src/`, the API routes, the data layer, the `.env` and `.gitignore`, and `package.json`. The repo contains **no Python, no notebooks, no model artefacts, no training scripts, no `models/` or `ml/` directory** — `package.json` has zero ML dependencies. Everything labelled "AI", "model", "prediction" or "forecast" in the UI resolves to either a hand-tuned arithmetic formula or a hardcoded string literal. That framing should be kept in mind throughout the report.

A scheduling note: this CLAUDE harness reports today's date as 2026-05-25, which is past the "22 May" proposal deadline you cited. I have written Section 6 as if the proposal is not yet locked, but please sanity-check what state your submission is in before acting on it.

---

## Section 1 — What's actually built

### 1.1 Repo layout

```
src/
├─ app/
│  ├─ page.tsx                       <-- the only rendered page
│  ├─ layout.tsx, globals.css
│  └─ api/
│     ├─ lta/route.ts                <-- LTA DataMall proxy (real)
│     ├─ lta/traffic-images/route.ts <-- LTA traffic camera proxy (real)
│     ├─ onemap/route/route.ts       <-- OneMap routing proxy (real)
│     └─ ura/building-context/route.ts <-- data.gov.sg URA buildings (real)
├─ components/
│  ├─ map/
│  │  ├─ SingaporeMap.tsx            <-- Leaflet + OneMap tiles (real basemap)
│  │  ├─ MapOverlays.tsx             <-- AI banner, legend, traffic-cam preview
│  │  ├─ UrbanIncident3D.tsx         <-- Three.js scene + SVG fallback (real)
│  │  └─ ResponseCorridor3D.tsx      <-- name-only; SEE 4.2
│  ├─ panels/                        <-- 19 panel components
│  ├─ ui/                            <-- TopBar, PanelToggle
│  └─ dashboard/KPICard.tsx          <-- DEAD CODE (no import from page.tsx)
├─ data/mock.ts                      <-- ALL canonical data lives here
├─ hooks/                            <-- 7 data hooks
├─ lib/
│  ├─ coverage.ts                    <-- the entire "coverage model"
│  ├─ weather.ts                     <-- NEA → station penalty heuristic
│  ├─ scenarios.ts                   <-- five scenario presets (UNUSED in UI)
│  ├─ fallbackData.ts                <-- simulated LTA/NEA when feeds fail
│  ├─ trafficCameras.ts              <-- ranks cams by proximity
│  └─ urbanContext.ts                <-- label/address normalisers
└─ types/index.ts
```

**Dead code path.** `page.tsx` renders `CommandSummaryPanel` + `SupportingIntelligenceDrawer`. The repo also contains `LeftPanel.tsx`, `RightPanel.tsx`, `StationCard.tsx`, `ScenarioControls.tsx`, `TimeSlider.tsx`, `KPICard.tsx`, `TravelTimesCard.tsx` — none of these are reachable from the active render tree. They import each other but nothing in `page.tsx` ever instantiates `LeftPanel` or `RightPanel`. This matters because the *intended* UI suggested by these orphans (scenario buttons, time slider, expressway ETA card) is not actually wired up. Two consequences:
- [src/app/page.tsx:112](src/app/page.tsx:112) hardcodes `const scenario: ScenarioPreset = "normal";` — the five scenarios in [lib/scenarios.ts](src/lib/scenarios.ts) cannot be triggered from the UI. The "morning-peak / heavy-rain / pie-accident / major-event" demo modes exist as data but have no button.
- `state.timeOffset` defaults to `0` ([useAppState.ts:7-12](src/hooks/useAppState.ts:7)) and no rendered component calls `actions.setTimeOffset(...)`. The time-shift forecasts in [data/mock.ts:143-150](src/data/mock.ts:143) keyed on 15/30/60 minutes will never appear to a user.

### 1.2 Which of the three proposal layers is implemented

| Proposal layer | Status in code | Notes |
|---|---|---|
| **L1 — Coverage Surface (dynamic isochrones)** | **Not implemented as described.** What ships is a *circular buffer* around each station with a radius that shrinks linearly by `timeOffset * factor`. See [SingaporeMap.tsx:81-85](src/components/map/SingaporeMap.tsx:81) and [coverage.ts:1-28](src/lib/coverage.ts:1). No isochrone is computed from the road network. See 2.1. |
| **L2 — Effective Response Time (CFR overlay)** | **Not implemented.** `VOLUNTEER_ZONES` is 8 hardcoded points ([data/mock.ts:132-141](src/data/mock.ts:132)) drawn as purple dots only when `activeView === "response"` ([SingaporeMap.tsx:617-631](src/components/map/SingaporeMap.tsx:617)). Nothing computes `min(appliance, CFR)`. No Siddiqui priors, no time-of-day variation, no planning-area model. See 2.3. |
| **L3 — 3D Urban Context (URA buildings)** | **Implemented** as a Three.js scene with an SVG fallback. Real GeoJSON pulled from `d_e8e3249d4433845bdd8034ae44329d9e` via `api-open.data.gov.sg`. Reverse-geocoded by OneMap. Heights are *inferred from footprint area*, not real ([api/ura/building-context/route.ts:89-100](src/app/api/ura/building-context/route.ts:89)). README is honest about this. |

### 1.3 AI/ML components

The brief asked for three AI/ML components. None of them exist as ML. Mapping to what's actually there:

| Brief item | What is in code | File / lines |
|---|---|---|
| Emergency Vehicle Travel Time Predictor (binary classifier or regression, 75% target) | A six-term arithmetic sum: `baseResponse + distancePenalty + readinessAdjustment + unitPenalty + scenarioPenalty + incidentPenalty`. No training, no test data, no accuracy claim that could be measured. | [page.tsx:292-370](src/app/page.tsx:292) |
| CFR Availability Model (spatial-temporal) | Does not exist. `VOLUNTEER_ZONES` is 8 static rows with hand-picked `density`, `aedCount`, `responseProbability`. | [data/mock.ts:132-141](src/data/mock.ts:132) |
| Composite Coverage Estimator | Does not exist. Coverage colour comes from `getCoverageLevel(responseTime)` thresholds at 8 and 11 min applied to the heuristic above. | [coverage.ts:12-16](src/lib/coverage.ts:12) |
| "Confidence %" displayed throughout UI | Hand-tuned curve: `Math.max(68, Math.min(97, Math.round(92 - scenarioConfig.extraDelay*4 - weatherPenalty*7 - distancePenalty*1.2 + (readiness-85)*0.4 + scenarioConfig.confidenceModifier)))`. | [page.tsx:340-353](src/app/page.tsx:340) |
| "AI Insights" stream | Hardcoded string literals in `AI_INSIGHTS` and `AI_PREDICTIONS`. The one CFR-flavoured insight ("Volunteer density improved after a myResponder notification") is a fixed string. | [data/mock.ts:32-150](src/data/mock.ts:32) |

To be fully concrete: the `weatherModel.insights` array at [weather.ts:205-261](src/lib/weather.ts:205) does generate insights deterministically from live rainfall thresholds (`peakRainStation.rainfall >= 1`, etc.), so it is at least *responsive* to real data — but it is rule-based, not learned.

### 1.4 Data sources — live vs hardcoded vs mocked

| Source | Status | Where |
|---|---|---|
| LTA DataMall — TrafficIncidents | **Live**, server-proxied with `AccountKey` env var, polled every 2 min, 60 s cache | [api/lta/route.ts](src/app/api/lta/route.ts), [hooks/useLTAData.ts:58](src/hooks/useLTAData.ts:58) |
| LTA DataMall — Speed bands (v4) | **Live**, polled every 5 min | [api/lta/route.ts](src/app/api/lta/route.ts), [hooks/useLTAData.ts:59](src/hooks/useLTAData.ts:59) |
| LTA DataMall — Traffic images | **Live**, polled every 4 min | [api/lta/traffic-images/route.ts](src/app/api/lta/traffic-images/route.ts) |
| LTA DataMall — Travel times, RoadWorks, VMS, TrafficFlow | Endpoints defined in [api/lta/route.ts:7-14](src/app/api/lta/route.ts:7) but **not consumed** anywhere in the active UI. `useLTATravelTimes` is exported but unused. | — |
| OneMap routing | **Live**, server-proxied | [api/onemap/route/route.ts](src/app/api/onemap/route/route.ts) |
| OneMap reverse geocode | **Live**, used to label URA buildings, 6 h cache | [api/ura/building-context/route.ts:227-277](src/app/api/ura/building-context/route.ts:227) |
| NEA — Rainfall, 2 h forecast, 24 h forecast | **Live**, polled every 5 min, called **directly from the client** (no server proxy) | [hooks/useNEAWeather.ts:54-144](src/hooks/useNEAWeather.ts:54) |
| URA Master Plan Buildings (data.gov.sg `d_e8e3249d4433845bdd8034ae44329d9e`) | **Live** GeoJSON, 6 h cache, with fallback | [api/ura/building-context/route.ts](src/app/api/ura/building-context/route.ts) |
| Building **heights** | **Inferred** from `SHAPE.AREA` via three brackets at 1800/4500 m² | [api/ura/building-context/route.ts:89-100](src/app/api/ura/building-context/route.ts:89) |
| Fire stations (16 of them, name + lat/lng + `avgResponse` + `units` + `readiness` + `risk`) | **Hardcoded** | [data/mock.ts:3-20](src/data/mock.ts:3) |
| Incidents (7) | **Hardcoded** | [data/mock.ts:22-30](src/data/mock.ts:22) |
| Volunteer / CFR zones (8) | **Hardcoded** | [data/mock.ts:132-141](src/data/mock.ts:132) |
| AI insights / predictions / confidences | **Hardcoded** | [data/mock.ts:32-150](src/data/mock.ts:32) |
| Response corridor delays (PIE/CTE/AYE/BKE/TPE) | **Hardcoded**, displayed as the "Optional Expanded Corridor Details" card | [data/mock.ts:154-160](src/data/mock.ts:154) |

The README's "Data sources" implication that traffic/weather/URA are wired in is true. The implication that fire stations and CFR zones are wired to authoritative sources (data.gov.sg, singstat) is **not** true — both are inline TypeScript literals.

---

## Section 2 — Does it match the proposal narrative?

### 2.1 "Dynamic isochrones across SCDF fire stations using real-time data"

**No. Coverage zones are static circles whose radius shrinks with a time slider.**

The map draws coverage as `L.circle(...)` at [SingaporeMap.tsx:539-547](src/components/map/SingaporeMap.tsx:539):

```ts
function coverageRadiusMeters(station: FireStation, timeOffset: TimeOffset, activeView: ViewMode) {
  const base = activeView === "coverage" ? 3200 : 2200;
  const factor = station.risk === "high" ? 30 : station.risk === "medium" ? 20 : 8;
  return Math.max(base - timeOffset * factor, 850);
}
```

Three things to flag from this:

1. The radius depends only on `timeOffset` and the station's hardcoded `risk` tier. Live LTA speed bands, NEA rainfall, and URA roadworks do **not** feed into the radius. They feed into the *colour* through `weatherModel.stationPenalties` (rain only), but the geometry stays a perfect circle around the station centroid.
2. There is no road-network traversal anywhere in the repo (no OSRM, GraphHopper, OneMap isochrone, or in-house BFS). OneMap routing is used only for the *single selected* station→incident leg in the route planner. Coverage and routing are two separate features that don't feed each other.
3. The radius does not even scale with the station's own `avgResponse`. Central FS (`avgResponse: 6.2`) and Tuas FS (`avgResponse: 9.8`) both start at the same base radius (3200 m / 2200 m). Only the colour, computed from `avgResponse + degradation + weatherPenalty`, differs. So the visual *area* of coverage is fixed and only the *colour* is data-driven — and even then, the colour-vs-radius can disagree (a large green ring around a red-coloured station is geometrically possible).

The radius shrinkage `base - timeOffset * factor` is not user-controllable because the TimeSlider component isn't rendered (see 1.1). So in practice every station shows the same circle on every load.

### 2.2 "Real LTA traffic data being pulled, or mock data labelled as live?"

**LTA traffic incidents, speed bands and camera images are genuinely live**, with a sensible "live → stale → error → mock" status hierarchy (`getLTAStatus` at [page.tsx:78-104](src/app/page.tsx:78), surfaced as a chip via `SourceStatus`). The mock fallback at [lib/fallbackData.ts:6-48](src/lib/fallbackData.ts:6) only kicks in when the live feed errors, and the UI badges it clearly as `mock`.

Counterpoints worth knowing:
- Speed-band v4 returns thousands of links; the map filters to `band <= 5` and `RoadCategory <= 4` ([SingaporeMap.tsx:402-403](src/components/map/SingaporeMap.tsx:402)) — that's a fine demo choice but the filter is hardcoded.
- LTA's TrafficFlow endpoint has special blob-link handling at [api/lta/route.ts:73-89](src/app/api/lta/route.ts:73), but nothing in the active UI consumes `trafficflow`.
- Speed bands and incidents are displayed as overlays. They are **not fed into the recommendation logic** in `recommendedAction` at [page.tsx:292-370](src/app/page.tsx:292) — that logic uses `weatherModel.stationPenalties` (rainfall) and OneMap route time (if a station is selected and a route exists), but it does not parse speed bands or LTA incidents. So the "live traffic" affects the map overlay but not the dispatch recommendation.

### 2.3 "Is the CFR overlay actually modelled, or a static visual layer?"

**Static visual layer only.** This is the single largest gap between the proposal narrative and the prototype.

`VOLUNTEER_ZONES` is 8 rows ([data/mock.ts:132-141](src/data/mock.ts:132)) with hand-picked `density`, `aedCount`, and `responseProbability`. It is drawn only in the `response` view as plain purple dots:

```ts
// SingaporeMap.tsx:617-631
if (activeView === "response") {
  VOLUNTEER_ZONES.forEach((zone) => {
    L.circleMarker([zone.lat, zone.lng], { ...fillOpacity: zone.responseProbability * 0.45 ... })
      .bindPopup(`Volunteer density ${zone.density} | AEDs ${zone.aedCount}`)
  });
}
```

It does not vary with time of day. It does not vary with incident type. It is never combined with appliance time. The `min(appliance, CFR)` calculation that defines the "Effective Response Time" layer in the proposal is **absent from the codebase**. There is no reference to the Siddiqui et al. priors (53.7% / 42.1% / 29.7% acceptance, 3.3 min median lead). The word "Siddiqui" does not appear anywhere.

The `IncidentFilter` type defines a `"cardiac"` option and `IncidentSelector` exposes the button ([panels/IncidentSelector.tsx:10-15](src/components/panels/IncidentSelector.tsx:10)), but the filter logic at [hooks/useAppState.ts:32-37](src/hooks/useAppState.ts:32) only handles `"all" | "fire" | "medical"`; "cardiac" silently returns all medical incidents. So the button labelled "Cardiac" doesn't actually filter to cardiac incidents — and even if it did, no separate code path treats cardiac differently from other medical calls.

The word `myResponder` appears exactly once in the repo: in a hand-written insight string at [data/mock.ts:104](src/data/mock.ts:104). There is no myResponder integration of any kind, real or stubbed.

### 2.4 "Is the colour coding tied to real predicted times, or hardcoded?"

**Partially tied to real data, but the input model is a heuristic, not a prediction.** Green / amber / red comes from `getCoverageLevel(responseTime)` ([coverage.ts:12-16](src/lib/coverage.ts:12)) applied to `station.avgResponse + degradation + weatherPenalty`. `avgResponse` is hardcoded per station. `degradation` is `timeOffset * (risk factor)`. `weatherPenalty` is the only term that flows from a real live source (NEA rainfall + 2h forecast + 24h regional forecast, [weather.ts:136-201](src/lib/weather.ts:136)).

So: if there is heavy rain near a station, that station's coverage colour will shift towards amber/red live. That's a real, defensible signal. Everything else feeding the colour is hardcoded.

---

## Section 3 — Technical quality

### 3.1 Code organisation

Well-organised for a hackathon webapp. Clear separation: `app/api` (server), `hooks` (data fetching), `lib` (pure functions), `components` (presentation). The pure functions in `lib/coverage.ts` and `lib/weather.ts` are easy to convert to a Python service if needed.

What it is **not** organised for is conversion to a "scriptable coverage-intelligence pipeline." The core calculations are interleaved with React `useMemo` calls inside `page.tsx` — particularly the 80-line `recommendedAction` useMemo at [page.tsx:292-370](src/app/page.tsx:292), which mixes data joining, ranking, OneMap route fallback, and natural-language reason-string assembly. To make this scriptable you'd want to lift that into `lib/recommendation.ts` and accept the inputs as plain objects.

### 3.2 Error handling

Reasonable for a demo. Each hook has `loading / error / fetchedAt` triplets and the page maps them to a `SourceStatus` chip with five modes (live/loading/mock/error/stale). Fallback paths exist for LTA, NEA, and URA. URA falls back to a synthetic 8-building block ([fallbackData.ts:141-190](src/lib/fallbackData.ts:141)) on any error.

Gaps:
- **NEA hook calls `api-open.data.gov.sg` directly from the client** ([useNEAWeather.ts:68-72](src/hooks/useNEAWeather.ts:68)). That's fine because the endpoint is public, but unlike LTA/OneMap there's no server proxy, so if the public endpoint adds CORS restrictions or rate limits, the dashboard breaks with no caching or retry logic.
- **`Promise.all([rainRes, fcRes, dayRes])`** at [useNEAWeather.ts:68](src/hooks/useNEAWeather.ts:68) means if any one of the three NEA endpoints fails, all three error out. A `Promise.allSettled` would degrade more gracefully.
- **`useLTAData` does not back off on errors** — it retries every 2 min indefinitely. If LTA returns 429, you'll keep hammering it. The 60 s LTA-side cache helps, but client-side backoff is missing.
- **`useURABuildingContext` writes loading state regardless of mount** under some paths but it does guard with `mountedRef`; OK.
- **Dev TLS bypass.** [api/lta/route.ts:5-32](src/app/api/lta/route.ts:5) and [api/lta/traffic-images/route.ts:7-35](src/app/api/lta/traffic-images/route.ts:7) install an `https.Agent({ rejectUnauthorized: false })` and fall back to it when `fetch()` throws in dev. This is scoped to `process.env.NODE_ENV !== "production"`, which is defensible, but a judge reading the code will see the words `rejectUnauthorized: false` and you should be ready to explain that.

### 3.3 API key management

Three keys, all in `.env.local`, all read server-side via `process.env`. `.env.local` is in `.gitignore`. `.env.local.example` ships placeholders only. NEA does not need a key.

One nit: `ONEMAP_API_TOKEN` is also read by the URA route ([api/ura/building-context/route.ts:228](src/app/api/ura/building-context/route.ts:228)) for reverse geocoding. If the token expires the URA buildings still render (geometry from data.gov.sg works without OneMap), but the buildings show as "Address unavailable". README says "If the OneMap token is missing or expired, the route planner will show an inline error state" — this is correct for routing, but it does not mention the URA address-enrichment dependency. Minor doc gap.

### 3.4 Performance / scale

The demo polls reasonably (LTA every 2 min, speed bands every 5 min, NEA every 5 min, URA on-demand only when incident changes). For the demo's 16 stations and 7 incidents this is fine.

Concerns when scaled to "full Singapore":
- **Coverage circles are O(stations)** so the visual layer scales linearly to ~100 stations. Fine.
- **Recommendation ranking is O(stations)** and runs in a single `useMemo` on every state change. At 16 stations this is microseconds; at 100, still fine.
- **The URA GeoJSON download is ~tens of MB** and gets parsed and held in memory in the Next.js server process as `geoJsonCache` ([api/ura/building-context/route.ts:61](src/app/api/ura/building-context/route.ts:61)). Currently this is a global `let geoJsonCache` outside any function. In a serverless deploy (Vercel) each cold start re-downloads the dataset. In long-running Node this is fine. Worth knowing if you deploy to Vercel.
- **The coverage radius** maxes at 3200 m at `timeOffset=0`, so two adjacent stations' circles overlap aggressively. With 100 stations the map becomes visually noisy. This is a presentation problem, not a correctness one.

### 3.5 Caching

- LTA proxy: `next: { revalidate: 60 }` ([api/lta/route.ts:26](src/app/api/lta/route.ts:26)) — 60 s server cache. Good.
- LTA traffic images: `cache: "no-store"` server-side ([api/lta/traffic-images/route.ts:27](src/app/api/lta/traffic-images/route.ts:27)) because image links expire fast. Correct choice.
- OneMap routing: `cache: "no-store"`. No memoisation between identical start/end pairs. A user clicking the same incident twice triggers a fresh upstream call. Mild waste.
- URA dataset: 6 h `GEOJSON_CACHE_TTL_MS` ([api/ura/building-context/route.ts:9](src/app/api/ura/building-context/route.ts:9)) and 6 h reverse-geocode cache. Good.
- NEA: no server cache (it's called from the client). Only the React state holds the last response.

---

## Section 4 — Critical bugs and risks

### 4.1 The "Cardiac" filter does not filter to cardiac incidents

[hooks/useAppState.ts:31-37](src/hooks/useAppState.ts:31):

```ts
const filteredIncidents = useMemo(() => {
  return INCIDENTS.filter((i) => {
    if (state.incidentType === "all") return true;
    if (state.incidentType === "fire") return i.type === "fire";
    return i.type === "medical";          // <-- catches BOTH "cardiac" AND "medical"
  });
}, [state.incidentType]);
```

`Incident.type` is `"fire" | "medical"` ([types/index.ts:10](src/types/index.ts:10)) — "cardiac" is not a possible `Incident.type`. The button ships and toggles, but pressing "Cardiac" shows all medical incidents. A judge filtering for cardiac in a CFR-themed demo would land on Marine Parade + Bishan + Tampines + Yishun + Jurong East — i.e., all medical regardless of whether they're cardiac. **High risk for a CFR-focused demo.**

### 4.2 `ResponseCorridor3D` is not 3D and ignores all its props

[components/map/ResponseCorridor3D.tsx:38-77](src/components/map/ResponseCorridor3D.tsx:38):

```ts
export default function ResponseCorridor3D(_: Props) {  // <-- props discarded
  return (
    ...
    {RESPONSE_CORRIDOR_DEMO.map((corridor) => {
      const tone = corridorTone[corridor.congestion];
      ...
      <div className={`mt-3 h-2.5 overflow-hidden rounded-full ${tone.track}`}>
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: tone.width }} />
                                                                  ^^^^^^^^^^^^^^^^^^^^^
                                                                  hardcoded "35%" / "62%" / "88%"
```

The component is named `ResponseCorridor3D` and is presented under the "Optional Expanded Corridor Details" disclosure in the supporting intelligence drawer ([SupportingIntelligenceDrawer.tsx:372-388](src/components/panels/SupportingIntelligenceDrawer.tsx:372)). It accepts `selectedStation`, `incidents`, `cameras`, `loading`, `error`, etc., and ignores every one of them. The bar widths are literal strings `"35%" | "62%" | "88%"`. A judge reading the code will see this immediately.

### 4.3 `recommendedAction` route hand-off vs ranking is fragile

[page.tsx:316-323](src/app/page.tsx:316):

```ts
const primary = rankedStations[0];
...
let predictedResponseTime = primary.total;
if (state.selectedStation && oneMapRoute && state.selectedStation.id === primary.station.id) {
  predictedResponseTime = Math.max(oneMapRoute.summary.totalTimeSeconds / 60, 0.1);
}
```

The ranking is done by the six-term heuristic. **OneMap's real route time only overrides the heuristic if the user has manually clicked the same station the heuristic happened to pick first.** If the user clicks a different station, the heuristic value is shown for the primary and the OneMap route is shown only in the route planner card. The two never get to disagree visibly. This is fine for the demo but it means:
- The displayed `Estimated arrival` on the Recommended Action card is the heuristic's number, not OneMap's, in 15/16 station selections.
- Switching the selected station to the recommended one suddenly changes the displayed ETA without the underlying conditions changing.

A judge asking "where does this minutes number come from?" will get an awkward two-source answer.

### 4.4 `coverageRadiusMeters` does not use `avgResponse`

[SingaporeMap.tsx:81-85](src/components/map/SingaporeMap.tsx:81). The radius depends only on `risk` tier and `timeOffset`. Two adjacent stations with very different `avgResponse` (e.g. Central 6.2 vs Tuas 9.8) draw the same-size circle. Combined with the colour coming from a different formula (`avgResponse + degradation + weatherPenalty`), this can produce **a large green circle around a station with a red interior dot**, or vice versa. Not a logic bug per se but visually contradictory.

### 4.5 Hardcoded values masquerading as dynamic computation

Beyond the ones already listed:
- `KPICard` / `AIBanner` "confidence" values from `AI_CONFIDENCE` keyed on `timeOffset` ([data/mock.ts:150](src/data/mock.ts:150)). The number "98%, 91%, 84%, 72%" pattern *looks* like a calibrated decay curve. It is four literals.
- "Forecast confidence: 91%" in `AIBanner` ([MapOverlays.tsx:38](src/components/map/MapOverlays.tsx:38)) — this whole banner is gated by `state.timeOffset`, which never changes, so it always reads `AI_PREDICTIONS[0]` = the static text "All coverage zones within operational targets..." The banner is **branded** with the words "PROTOTYPE FORECAST" in the UI ([MapOverlays.tsx:24](src/components/map/MapOverlays.tsx:24)), which is helpful — please keep that label.
- The "Confidence" column in `AIInsightsList` ([AIInsightsList.tsx:53-55](src/components/panels/AIInsightsList.tsx:53)) reads `insight.confidence ?? 86 ?? 80 ?? 74` (per severity tier). For the hardcoded insights this is just the literal in mock.ts; for the dynamically-generated weather insights it's the literal in weather.ts (`confidence: 88` etc.).

### 4.6 ML data leakage

Not applicable — no train/test split exists because no model is trained. Worth noting as a positive: there's no fabricated "model accuracy" number in the UI either, which would have been the bigger risk.

### 4.7 Hidden dependencies / fresh-clone risk

- `npm install && npm run dev` should work on a fresh clone given Node 18+. The `https.Agent({ rejectUnauthorized: false })` dev fallback means LTA works in dev even with a misconfigured corporate cert store; in prod it strictly fails.
- The OneMap routing route ([api/onemap/route/route.ts:111](src/app/api/onemap/route/route.ts:111)) sends `Authorization: ${token}` without a `Bearer ` prefix. OneMap historically accepts the bare token; if their auth tightens this will silently 401. Worth knowing.
- No CI, no tests, no lint enforcement in `package.json` beyond `next lint`. Fine for a hackathon.

### 4.8 Things that would specifically embarrass you in a code inspection

In rough order of severity:

1. **`ResponseCorridor3D` discards all props and renders hardcoded percentages.** A judge reading the file sees `function ResponseCorridor3D(_: Props)` and three lines of `"35%" / "62%" / "88%"`. The name is also misleading — it is 2D bars.
2. **`VOLUNTEER_ZONES` as a Type'ed 8-row literal in mock.ts under the "L2 differentiator" framing.** If the proposal claims a CFR availability model with empirical priors, opening `data/mock.ts` reveals it is 8 lines of made-up numbers.
3. **The hardcoded `"Volunteer density improved after a myResponder notification"` string** dressed up as an AI insight with a confidence number. The single mention of myResponder in the entire codebase is a literal in a string.
4. **The "Cardiac" filter that doesn't filter to cardiac.** Bad luck if a judge clicks it.
5. **`AI_CONFIDENCE: Record<number, number> = { 0: 98, 15: 91, 30: 84, 60: 72 };`** as the source of every "% confidence" claim tied to the (non-functional) time slider.
6. **Two parallel formulas for coverage** — circle radius vs colour — that can disagree.

---

## Section 5 — Interview defensibility

### Layer 1 — Coverage Surface

| Question a judge could ask | What's missing to defend it |
|---|---|
| "How is this isochrone computed? Walk me through the road-network traversal." | There is no traversal. To defend, you need at least an OSM-based or OneMap-based isochrone for the demo stations — even a precomputed 8-min polygon per station, stored as static GeoJSON, would be defensible. |
| "What live LTA signal is changing this green zone in real time?" | Right now: only the colour responds to NEA rainfall; the geometry doesn't move. To defend, you need at least one segment-level penalty (e.g. speed-band-weighted travel time on the nearest expressway link) to feed back into the displayed radius or polygon. |
| "Your `avgResponse` numbers — 6.2 for Central, 9.8 for Tuas — where do they come from?" | They are hand-picked literals in `data/mock.ts`. No data source is cited. Defensible answer would be either (a) SCDF's published response-time statistics with a citation, or (b) a documented Monte-Carlo estimate from OneMap drive times at multiple times of day. Either is fine; *neither is there now*. |

### Layer 2 — Effective Response Time

| Question | What's missing |
|---|---|
| "Show me the `min(appliance, CFR arrival)` calculation for the Marine Parade cardiac call." | The calculation does not exist in the code. To defend, you need a function (call it `effectiveResponseTime`) that takes a CFR-density estimate, applies the Siddiqui acceptance priors, samples an arrival time, and computes the min. Even a 30-line deterministic version would suffice. |
| "How does the CFR density change between daytime and 03:00?" | It doesn't — `VOLUNTEER_ZONES` is static. To defend, density needs at least a `byHour: number[]` field or a multiplier curve, plus a UI surface that shows the change. |
| "What's your data source for the volunteer density per planning area?" | The proposal cites singstat population proxy + Siddiqui priors. The code uses 8 made-up rows. A defensible answer needs at least a singstat-derived population-per-planning-area JSON shipped in `data/` and an acknowledgement of the proxy assumption. |

### Layer 3 — 3D Urban Context

This layer is the most defensible, but still has answer gaps.

| Question | What's missing |
|---|---|
| "How accurate are these building heights? That tower looks 40 metres." | Heights are inferred from footprint area in three brackets (`>=4500 m² → 58-70 m`, `>=1800 → 30-42 m`, else `14-20 m`) at [api/ura/building-context/route.ts:89-100](src/app/api/ura/building-context/route.ts:89). A judge familiar with URA datasets will know real heights aren't published in this dataset, so the inference is acceptable — but the *bracket choice* is undocumented. You'd want either a 50-building manual calibration or a citation. |
| "Could a commander use this for pre-arrival situational awareness today?" | The 3D scene renders building blocks but has **no overlay of the response asset, no path-of-approach, no occupancy proxy** (e.g. flat count from BCA or HDB block residency). To defend a "pre-arrival situational awareness" claim, you want at least an arrival indicator at the road-facing facade. |
| "What happens for non-incident-building targets (industrial, dense MCST)?" | The "incident building" selection is `nearby[0]` after sort by `distanceFromIncidentMeters` at [api/ura/building-context/route.ts:316-320](src/app/api/ura/building-context/route.ts:316). The closest *centroid*, not the building that contains the incident point. For a campus or large mall the centroid pick is wrong. Defensible answer requires point-in-polygon and a tiebreak rule. |

---

## Section 6 — Recommendations

Each item has a rough effort estimate. "h" = hours of focused work for one developer.

### Must-fix before proposal submission (deadline 22 May)

These either break the narrative or contain code that judges would see and downgrade you on.

1. **Either implement a minimal CFR overlay calculation, or restate L2 as forthcoming.** The "core differentiator" of the proposal currently does not exist in code at all. Two options:
   - (a) ~4 h: Add a function `effectiveResponseTime(incident, station, cfrDensityByPlanningArea, hourOfDay)` that returns `min(appliance, sampled CFR arrival)` and surface it as a number on the Recommended Action card when the incident is cardiac, with the Siddiqui priors as named constants. Mock the density per planning area as a JSON file in `data/` — at least with a source comment pointing to singstat.
   - (b) ~1 h: Rewrite the proposal's L2 paragraph to say "model design specified; empirical fit and implementation in progress" and remove the static volunteer dots from the demo so judges don't ask about them.
2. **Fix the Cardiac filter.** ~30 min. Either (a) add a `subtype` field to `Incident` and have at least the Marine Parade and Bishan calls flagged as cardiac, with the filter narrowing to subtype, or (b) drop the "Cardiac" button from `IncidentSelector` until L2 lands. Right now clicking it is a footgun.
3. **Rewrite or rename `ResponseCorridor3D`.** ~1 h. Either:
   - (a) Wire the `selectedStation`/`incidents`/`speedBands` props you already pass to it through to compute *actual* per-corridor delay from LTA speed bands and OneMap route geometry; or
   - (b) Rename it to `ResponseCorridorOverview`, delete the discarded `_: Props`, and either accept that it's illustrative or remove it from the drawer.
4. **Stop drawing static `VOLUNTEER_ZONES` purple dots until L2 is real.** ~5 min. Comment out the `if (activeView === "response") { VOLUNTEER_ZONES.forEach(...) }` block at [SingaporeMap.tsx:617-631](src/components/map/SingaporeMap.tsx:617). Leaves the proposal honest about what's built. If you keep the dots, label them in the legend as "static demo locations, not modelled density."
5. **Tie `coverageRadiusMeters` to `station.avgResponse`.** ~30 min. Replace `const base = activeView === "coverage" ? 3200 : 2200;` with a radius that scales inversely with `avgResponse` (e.g. `2200 * (6.2 / station.avgResponse)`). This costs nothing and makes the circle visually consistent with the colour and with each station's individual response baseline.
6. **Remove or hide the orphan panels (`LeftPanel`, `RightPanel`, `ScenarioControls`, `TimeSlider`, `StationCard`, `KPICard`, `TravelTimesCard`).** ~30 min. Either delete them or move under `src/components/_legacy/` so a code-reviewing judge doesn't pull up `ScenarioControls` and ask why scenario buttons don't appear in the demo.

**Total: ~6-8 h** for the minimum coherent submission story.

### Should-fix before top 10 interview (5 June)

These improve defensibility under direct questioning.

7. **Add a real (if simple) coverage isochrone for the four demo stations.** ~6-8 h. Use OneMap's batch routing to compute drive-time polygons at 8 min and 11 min for the 4 stations you actually demo (Central, Alexandra, Bishan, Tampines). Ship as static GeoJSON in `data/isochrones/`. Render via Leaflet `L.geoJSON` instead of `L.circle`. This single change makes Section 5 Layer 1 question 1 defensible.
8. **Add a "predicted travel time" stub that you can defend as a 75% binary classifier.** ~6 h. Take your existing six-term sum, run it against the OneMap-routed truth for 50 station→incident pairs at 3 times of day (~150 samples), report a binary "within 8 min" agreement rate. If the rate is below 75% you can tune the coefficients; if above, you have a real defensible number. Even better: log it as `metrics.json` in the repo.
9. **Wire LTA speed bands into the recommendation ranking.** ~4 h. Add a `corridorPenalty(station, incident, speedBands)` that takes a 1 km buffer around the OneMap route polyline and computes a weighted average of nearby speed-band values. Add it as a 7th term in the `recommendedAction` sum. Now "live traffic" actually changes the recommendation.
10. **Add the Siddiqui priors as named constants and a CFR sampling function** (even if mocked density). ~3 h. `CFR_ACCEPTANCE = { evening: 0.537, day: 0.421, night: 0.297 }; CFR_LEAD_MIN = 3.3;`. A `sampleCFRArrival(incident, hourOfDay, density)` that returns an expected arrival. Show it on the Recommended Action card for cardiac incidents. Cite Siddiqui et al. in a comment.
11. **Fix the `recommendedAction` heuristic vs OneMap collision.** ~2 h. Always use the OneMap route time for the recommended station if available (compute the route for the heuristic's top-ranked station, not only for the user-selected one). Otherwise the "Estimated arrival" number changes meaning depending on which station the user has clicked.
12. **Point-in-polygon for "incident building" detection.** ~2 h. In [api/ura/building-context/route.ts:316-320](src/app/api/ura/building-context/route.ts:316), test whether `(incidentLat, incidentLng)` is inside any building polygon before falling back to centroid distance.
13. **Add a `Promise.allSettled` fix to the NEA hook** so rainfall and 2-h forecast can survive a 24-h endpoint failure. ~30 min.
14. **Document `AI_CONFIDENCE` and the recommendation coefficients in code comments.** ~1 h. At minimum, add a single comment at [page.tsx:340-353](src/app/page.tsx:340) explaining that the confidence is a deterministic function of the inputs, not a learned posterior. A judge auditing the file should not have to reverse-engineer this.

**Total: ~25-30 h.**

### Nice-to-have for finals demo (3 July)

15. **Real planning-area-resolution CFR density from singstat population by planning area.** ~8 h. Replace `VOLUNTEER_ZONES` with a planning-area → density map, drawn as a translucent choropleth that varies with the (re-introduced) time slider.
16. **Bring back the time slider and scenario buttons** now that they have something real to control (isochrone polygons that visibly shrink, CFR density that visibly redistributes). ~4 h.
17. **Add a per-incident "Effective Response Time" KPI** in the Command Summary that explicitly shows `min(appliance ETA, expected CFR ETA)` for cardiac incidents, and just appliance ETA otherwise. ~3 h.
18. **A simple A/B export from the demo** — "with CFR" vs "without CFR" response-time histograms over the demo's 7 incidents — saved as a PDF the panel can hand to judges. ~6 h.
19. **3D pre-arrival overlay**: arrow pointing to the road-facing facade of the incident building, plus distance-to-nearest-hydrant if you can find a Singapore hydrant dataset. ~6 h.
20. **A short "data sources" page** (`/about` route or modal) that names each live endpoint, polling interval, and last-fetched timestamp. ~2 h. Cheap and very persuasive to judges who are wary of mocked demos.
21. **Replace the four hardcoded `AI_PREDICTIONS` entries with templated narrative generated from the current weather + LTA state.** ~4 h. Brings the banner to parity with the more responsive `weatherModel.insights` already in `lib/weather.ts`.

**Total: ~30-35 h.**

---

## Strengths worth keeping

To balance the critique: the prototype is far from a hit job, and several things in it are above hackathon average.

- **Live data plumbing is real and well-isolated.** The four server-side proxies for LTA / OneMap / URA cleanly separate the AccountKey from the client, with sensible 60 s and 6 h cache choices and fallbacks for dev TLS quirks.
- **`SourceStatus` discipline.** The five-state live/loading/mock/error/stale chip is consistently surfaced for LTA and NEA. Most demos hide their data freshness; this one shows it.
- **`buildWeatherOperationalModel` in `lib/weather.ts`** is the most defensible piece of analytics in the repo. It combines rainfall, 2-h forecast, 24-h regional forecast, and time-offset weighting into per-station penalties with clearly named functions and constants. This is the layer to point judges at when they ask "show me a calculation."
- **The Three.js scene with SVG fallback** is genuinely well-engineered, including WebGL feature detection, proper disposal of geometries and materials, and an OrbitControls layer with raycaster click selection. The README is also honest about the indicative-height caveat.
- **URA dataset integration via the data.gov.sg `poll-download` pattern** is correct (the dataset isn't directly downloadable — you must poll for a signed URL first). Many demos get this wrong.
- **No fabricated ML accuracy numbers.** The UI shows "confidence" but never claims a model-evaluation metric like "75% accuracy". Whatever you tell judges about the AI/ML components, the code itself doesn't lie further than the proposal does.

---

## Closing note

The prototype is a credible *coverage-intelligence dashboard*. It is not yet a credible *coverage-intelligence model*. The narrative gap that matters most is L2 (CFR), where the proposal makes its strongest differentiation claim and the code makes none. The narrative gap second-most worth closing is L1's "dynamic isochrone" claim, since the geometry is currently a static circle.

Awaiting your direction on which items from Section 6 to prioritise before I touch the code.
