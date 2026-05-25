# scdf-coverage — Model Review

**Reviewer note.** This is a separate repository from the `WiFire_SCDFInnovationChallenge` webapp I reviewed earlier. The two have no shared code and no exchanged API contract; nothing in this Python prototype is consumed by the Next.js dashboard. My previous statement that "no model exists" referred to the webapp repo only, and I correct it here: a methodologically real ML pipeline does exist in this repo. It is unfinished but substantive.

This review covers: what's actually built, what's runnable, what the headline accuracy number will mean when you produce it, and the specific points a competent technical reviewer or judge will challenge.

---

## 1. What's actually built

| Layer | Status |
|---|---|
| `src/config.py` | Env / paths / OneMap token caching / station list. Has SSL truststore + custom-CA-bundle hooks for corporate networks. |
| `src/data_loaders.py` | Live LTA speedbands + incidents (paginated), OneMap routing, NEA rainfall. Writes raw JSON + processed parquet. |
| `src/network.py` | OSM road graph load/save, LTA-band → edge matching via `osmnx.distance.nearest_edges`, Dijkstra by `travel_time_min`. |
| `src/features.py` | Haversine / Manhattan / bearing / cyclical-hour / path aggregates (segments, road class, expressway share, speed band, length) / rainfall-along-path proxy / time-of-day traffic multiplier. |
| `src/model.py` | LightGBM wrapper (`CoverageModel`) with `predict_proba`, save/load. |
| `src/viz.py` | Folium basemap + station markers. Thin. |
| `tests/test_data_loaders.py` | Three pytest smoke tests (NEA / OneMap / LTA) with proper `skipif` guards on missing env vars. |
| `requirements.txt` | Pinned modern versions: pandas, geopandas, osmnx, networkx, folium, lightgbm, sklearn, matplotlib, seaborn, jupyter, pyarrow, truststore. |
| Notebook 1 — ingestion | Pulls LTA/OneMap/OSM/NEA. Caches to `data/raw/` + `data/processed/`. |
| Notebook 2 — exploration | (not reviewed in depth) |
| Notebook 3 — feature engineering | Builds the (station × target × hour) training set. 4 stations × 500 targets × 4 timestamps ≈ 8 000 rows. Stratified 80/20 split. |
| Notebook 4 — model training | Baseline LR → LightGBM with early stopping → 5-fold CV → held-out test eval (accuracy/AUC/cm/PR/ROC/calibration) → feature importance → error analysis → save. |
| Notebook 5 — visualization | Per-station + composite + time-of-day P(reach ≤ 8 min) maps. CFR-density overlay (honestly labelled a stub). |

**This is real ML methodology** — baseline, CV, held-out test, calibration check, error analysis — not heuristic theatre. Credit where due.

---

## 2. State of the model right now

`data/processed/`, `data/raw/`, and `data/cache/` are **empty** in the zip.

That means:
- No `sg_road_network.pkl`
- No `edges_with_traffic.parquet`
- No `rainfall_latest.parquet`
- No `training_data{,_train,_test}.parquet`
- No `coverage_classifier.lgb` and no `coverage_preprocessor.pkl`
- No `onemap_token.json`

The model has not been trained. The "≥ 75% accuracy" target stated in `README.md` line 12 and re-asserted in `04_model_training.ipynb` cell 10 (`Acceptance criterion (≥75% accuracy): {"PASS" if acc >= 0.75 else "FAIL — iterate"}`) is a target, not an achieved number.

The notebooks have **no preserved cell outputs** except one — notebook 1 cell `beeae1a7` shows a preserved `HTTPError: 404 Client Error: Not Found for url: http://datamall2.mytransport.sg/ltaodataservice/TrafficSpeedBands?$skip=0`. That's the legacy unversioned LTA path. The `data_loaders.py:40-43` mapping has since been updated to `"TrafficSpeedBands": "v3/TrafficSpeedBands"`, but the notebook was not re-run after the fix. So if you screenshot Notebook 1's "validation summary" cell for the proposal today, it will show LTA in an error state until you re-run.

---

## 3. The big methodological issue — circular labels

This is the single most important thing in this review. Whatever number Notebook 4 prints, this will be the first thing a competent judge or external reviewer attacks.

### How the label is constructed

[notebooks/03_feature_engineering.ipynb](notebooks/03_feature_engineering.ipynb), cell 10:

```python
travel_min = rec['base_travel_min'] * mult
...
'label': int(travel_min <= THRESHOLD_MIN),
```

`rec['base_travel_min']` comes from cell 8:

```python
path, base_min = shortest_path_travel_time(G_main, src_node, int(tgt))
```

Which is Dijkstra on `travel_time_min` — set in [src/network.py:75-85](src/network.py:75):

```python
speed = edge_speed_kmh(band)  # band -> SPEED_BAND_TO_KMH lookup
length_m = data.get("length", 0.0) or 0.0
data["travel_time_min"] = (length_m / 1000.0) / max(speed, 1.0) * 60.0
```

So:

> **label = 1 iff (sum of OSM edge lengths / LTA-band-derived speeds along the shortest path) × traffic_multiplier(hour) ≤ 8.**

### What features the model sees

From [notebooks/03_feature_engineering.ipynb](notebooks/03_feature_engineering.ipynb), the row dict includes:
- `path_length_km` — the same numerator
- `avg_speed_band` — the same denominator, pre-aggregation
- `expressway_share`, `avg_road_class` — strongly correlated with the speed used in the denominator
- `matched_band_share` — tells the model how confident the denominator is
- `hour_sin`, `hour_cos` — recover `hour` and therefore `traffic_multiplier(hour)` exactly

### Why this is a problem

The label is a deterministic function of inputs the model has direct access to. A LightGBM with 17 features and 8 000 training examples will not just exceed 75% — it will likely sit around **95-99% test accuracy and AUC ≥ 0.98**. That number does not measure "can this model predict emergency-vehicle travel time." It measures "can a flexible function approximator invert a closed-form computation defined in the same notebook."

The README at line 92-101 lists out-of-scope items but does not flag this. Notebook 3 cell 0 frames the proxy choice honestly ("we use OSM + LTA as a proxy for actual emergency vehicle travel time"), but the framing is about the *source* of ground truth, not the *circularity*. Both the labels and the features come from the same proxy; this is what makes the resulting accuracy uninformative.

### What a 5-minute defence question will sound like

> "Your feature list includes path length and average speed band. Your label is whether path length divided by average speed exceeds 8 minutes. How is the model doing anything other than learning division?"

You don't have an answer to this in the current code. You need one before the interview.

### How to fix it

Two paths, increasing in cost and credibility:

**Path A — Hold out features that determine the label.** ~3 h. Remove `path_length_km`, `avg_speed_band`, `expressway_share` (and arguably `num_segments`, `matched_band_share`) from `FEATURE_COLS` in Notebook 4. Keep only the features a *real-time* coverage estimator would have *before* routing: station id, target lat/lng, distance, bearing, hour, rainfall. Now the model has to learn to *infer* path length from geography and hour. Accuracy will fall — that is the point — and the falling number is the one worth claiming. Plan for 78-85% on this stricter setup, which still clears your 75% target.

**Path B — Use an independent source for the label.** ~6-8 h. Treat OneMap drive-time routing as the label generator (it uses a different road graph and different speed assumptions than your OSM + LTA-band stack). Compute 8 000 OneMap routes once (cache them; OneMap caps ~250 req/min so this is roughly an hour of throughput plus retry logic). Now your features can include everything in the current set and the label is genuinely independent. This is the version you can defend without caveats.

Whichever path you take, **add a third sanity baseline to Notebook 4**: a one-line deterministic predictor that just computes `path_length_km / (avg_band_speed_kmh(avg_speed_band) / 60) * traffic_multiplier(hour) <= 8`. If that predictor hits ~100% test accuracy on the current setup (which it should by construction), and LightGBM also hits ~100%, you've proven the leakage out loud. If you've moved to Path A or B and LightGBM still beats the deterministic baseline, the gap is the part you can claim.

---

## 4. Smaller methodological issues

### 4.1 Train/test split is row-level, not target-level

[notebooks/03_feature_engineering.ipynb](notebooks/03_feature_engineering.ipynb), cell 14:

```python
training_df['strata'] = training_df['station_id'] + '_' + training_df['hour'].astype(str)
train_df, test_df = train_test_split(
    training_df, test_size=0.2, stratify=training_df['strata'], random_state=RNG_SEED,
)
```

Each `(station, target)` pair appears as 4 rows (one per hour) with the same `path_length_km`, `avg_speed_band`, `expressway_share`, `tgt_lat`, `tgt_lng`, and `rainfall_mm`. The split puts roughly 3.2 of those 4 hourly rows in train and 0.8 in test. So for any test row, the model has very likely seen the same target node at a different hour during training. Even with the headline leakage in §3 fixed, this lets the model memorise per-target path features.

**Fix.** ~30 min. Split at the target-node level: choose 20% of target nodes as the test set and put all 4 hours for those nodes in test; everything else in train. Be sure to keep stratification by station so each station contributes proportionally to both sides.

### 4.2 Same shortest path used at all 4 hours

[notebooks/03_feature_engineering.ipynb](notebooks/03_feature_engineering.ipynb), cell 8: `path, base_min = shortest_path_travel_time(...)`. Cell 10: `travel_min = rec['base_travel_min'] * mult`. The path is computed once (free-flow optimal) and re-costed at four hours by multiplying.

Notebook 3 cell 7 acknowledges this: "This is a shortcut (in real traffic, optimal routes shift); documented." That's fair — it's a known simplification of the data-generating process. But combined with §4.1, it means the hour feature carries no path-routing information at all — the per-pair hour signal is exactly `traffic_multiplier(hour)`, a 4-point function the model recovers from `(hour_sin, hour_cos)` with trivial accuracy.

### 4.3 `rainfall_mm` is constant per pair

Rainfall is fetched once in Notebook 3 cell 4 (`rainfall = pd.read_parquet(PROCESSED_DIR / 'rainfall_latest.parquet')`) and cached per pair in `rainfall_cache`. The four hourly rows for a given pair share the same `rainfall_mm`. The model cannot learn a rainfall × hour interaction because the data has none. This is fine if you treat rainfall as a current-conditions feature, but worth being explicit about: the experiment does not actually test whether the model uses rainfall — only whether `rainfall_mm` has signal *in mean*.

### 4.4 `day_of_week = 2` is a constant

[notebooks/03_feature_engineering.ipynb](notebooks/03_feature_engineering.ipynb), cell 2: `DAY_OF_WEEK = 2  # Wednesday — held constant for the demo`. Then included in `FEATURE_COLS` in Notebook 4. A zero-variance feature is harmless to LightGBM (it gets zero gain) but it will show up in the feature-importance bar chart as a stub. Either drop it from `FEATURE_COLS` or note it in the chart caption.

### 4.5 Logger-before-definition bug in `data_loaders.py`

[src/data_loaders.py:25-34](src/data_loaders.py:25):

```python
if not SSL_VERIFY:
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    logger.warning(
        "SSL_VERIFY is OFF — HTTPS certs are not validated. Demo-only; do not "
        "use with sensitive credentials over an untrusted network."
    )

logger = logging.getLogger(__name__)
```

`logger` is referenced on line 30 but assigned on line 34. If anyone sets `SSL_VERIFY=false` in their `.env` (which is the exact case the warning is meant to cover), import will crash with `NameError: name 'logger' is not defined`. Move the `logger = logging.getLogger(__name__)` line above the `if not SSL_VERIFY:` block.

### 4.6 Notebook 1 has a stale error preserved as its top output

The preserved 404 in cell `beeae1a7` is from when the LTA endpoint path was unversioned. `data_loaders.py` has since switched to `v3/TrafficSpeedBands`, but Notebook 1 wasn't re-run. README line 67 says "Each notebook is runnable top-to-bottom" — that's true for fresh runs, but the zipped state contradicts it. Re-run Notebook 1 end-to-end with keys before screenshotting anything for the proposal.

### 4.7 Notebook 1 cell `05407a26` shows the author's local path

The preserved output reads `Project root: /Users/wenjing/scdf-coverage`. Tiny privacy nit — most reviewers will not care, but if this gets attached to a public proposal artefact, clear outputs before zipping. (`jupyter nbconvert --clear-output --inplace notebooks/*.ipynb`)

### 4.8 CFR overlay's "Siddiqui et al. 2023" citation does not match the literature

[notebooks/05_coverage_visualization.ipynb](notebooks/05_coverage_visualization.ipynb), cell 18 markdown cites "Siddiqui et al. 2023 report higher off-duty CFR acceptance evenings vs. business hours." Cell 19 then defines:

```python
CFR_HOURLY = {8: 0.45, 13: 0.40, 18: 0.65, 23: 0.55}
```

The proposal brief I was given quotes Siddiqui et al. (2023) as **53.7% evening / 42.1% daytime / 29.7% overnight**. Those numbers are not what's in `CFR_HOURLY`. The closest match is 13:00 = 0.40 vs reported 0.421 (day) — defensible. But 18:00 = 0.65 is materially higher than 0.537 (evening), and 23:00 = 0.55 is nearly double the reported 0.297 (overnight). At 08:00 the cited "off-duty CFR acceptance evenings vs. business hours" framing doesn't map cleanly to a single number.

A judge who knows the Siddiqui paper will challenge this directly. Two options:
- (a) ~10 min. Replace `CFR_HOURLY` with the literal Siddiqui numbers and adjust the interpolation comment. `CFR_HOURLY = {8: 0.421, 13: 0.421, 18: 0.537, 23: 0.297}` or similar. Be explicit that these are reported acceptance rates from a single study.
- (b) ~5 min. Remove the Siddiqui reference entirely from the markdown if you don't want to commit to the numbers; describe `CFR_HOURLY` as "hand-picked illustrative values for the demo."

The cell markdown ends with "*The point of this cell is to produce a layer that looks like CFR density for the proposal screenshot — not a real density estimate.*" That self-flag is good and should stay. But if you cite Siddiqui at the top of the cell, you cannot then say "not a real density estimate" without inviting "then why cite the paper?" Pick one framing.

### 4.9 Visualization in Notebook 5 reuses the leaked features

Even with the model's training/test leakage fixed, Notebook 5's grid prediction loop (cell 10) constructs feature rows containing `path_length_km`, `avg_speed_band`, `expressway_share` etc. — i.e., it still feeds the model the path-derived columns at inference time. If you adopt Path A from §3 (drop those columns from training), update `feature_rows` in Notebook 5 to match.

---

## 5. What's well-built and worth keeping

Genuinely strong points:

- **Logistic-regression baseline before LightGBM** (Notebook 4, cells 4-5). Most demos skip this. You can credibly say "we beat the distance-only baseline by N points" — once you've fixed the leakage so the LightGBM lift means something.
- **5-fold cross-validation in addition to a held-out test set** (Notebook 4, cell 8). The right amount of effort for an 8 000-row dataset.
- **Calibration curve in the eval bundle** (Notebook 4, cell 11). Calibration is the thing operations people care about (you'll be over- or under-confident at the 50% threshold) and most demos don't even plot it.
- **Error analysis by station × hour** (Notebook 4, cell 15). This is what lets you say "the model is weakest at Tuas at 18:00" specifically.
- **Token caching on disk with expiry** ([src/config.py:167-200](src/config.py:167)). Three-day OneMap tokens with 30-min refresh margin. Correct.
- **`truststore.inject_into_ssl()` import-time hook** ([src/config.py:16-22](src/config.py:16)) for corporate network root CAs, plus `SSL_CA_BUNDLE` and `SSL_VERIFY` env knobs. Real-world setup detail that's rare in demo code.
- **Bounded LTA pagination** with a polite `time.sleep(0.1)` and a `max_pages` guard ([src/data_loaders.py:62-82](src/data_loaders.py:62)). The webapp's LTA pulls one page only; this is more correct.
- **Worst-band aggregation** when multiple LTA bands match a single OSM edge ([src/network.py:208-213](src/network.py:208)): take the slowest. That's the right conservative choice for emergency response.
- **The `Out of scope` list in the README** (lines 91-101). Explicitly cutting CFR, conformal prediction, multi-incident, TFMS, full Singapore is the honest framing. Don't soften this for the proposal — it's what makes the rest defensible.

---

## 6. Integration with the webapp

There is none. To be specific:

- The webapp's `FIRE_STATIONS` is 16 stations; this repo's `DEMO_STATIONS` is 4 (Jurong, Bishan, Tampines, Central). The IDs and coordinates don't match.
- The webapp's coverage colour comes from `getCoverageLevel(getAdjustedResponseTime(station, timeOffset, weatherPenalty))` — a TS heuristic. Nothing in the webapp consumes a `.lgb` file or queries a Python service.
- No `metrics.json`, no exported PNGs from Notebook 5 referenced by the webapp, no API contract.

If the proposal claims the webapp is "powered by" this model, that integration does not exist yet. Three options before the interview:

- (a) ~3 h. Run Notebook 5, export the PNG outputs (`coverage_*_by_hour.png`, `best_station_per_cell_18h.png`), and embed them in the webapp as static images alongside the live circles. Frame: "interactive operational layer + offline ML coverage breath."
- (b) ~6 h. Add a thin FastAPI service that wraps `CoverageModel.load()` and exposes `POST /predict` over `(station_id, lat, lng, hour, rainfall_mm) → probability`. Have the webapp call it once per station × incident and render the probability number on the Recommended Action card.
- (c) ~30 min. Don't claim integration. State in the proposal that the prototype splits into a webapp (operations layer) and a model notebook (analytics layer), and that productionising the bridge is the next milestone.

(c) is the most honest framing given the timeline. (a) is the cheapest way to make the model show up visibly in the demo.

---

## 7. Recommendations (model-side)

Adapted from the structure of the webapp review.

### Must-fix before any external audience sees the model

1. **Fix the circular-label issue** — Path A (drop path-derived features) OR Path B (OneMap labels). ~3-8 h. Without this you cannot defend the headline number.
2. **Add the deterministic-formula baseline to Notebook 4.** ~30 min. `pred = (path_length_km / band_speed * traffic_multiplier(hour)) <= 8`. If it scores ~100%, that is the proof your leakage was real. Keep it in the notebook as a sanity check.
3. **Switch the train/test split to target-node level.** ~30 min. Stratify by station, hold out 20% of nodes.
4. **Fix the `logger`-before-definition bug** in `data_loaders.py`. ~5 min.
5. **Re-run Notebook 1 end-to-end with keys** so the validation-summary cell shows green for LTA / NEA / OSM. ~30 min including time for the OSM pull.
6. **Resolve the Siddiqui-citation mismatch** in Notebook 5. Either fix the numbers or drop the citation. ~10 min.

**Total: ~5-10 h.**

### Should-fix before the interview

7. **Run Notebooks 2-4 end-to-end after the fixes** and commit executed versions of the notebooks with cell outputs intact. A screenshot of the held-out test cell (accuracy + AUC + confusion matrix + classification report) is the single most persuasive artefact you can put in the proposal.
8. **Export Notebook 5's PNGs** to `data/processed/maps/` so a reviewer can see the coverage maps without re-running the pipeline. ~30 min after Notebook 4 has run.
9. **Ship a `metrics.json`** at repo root with `{accuracy_test, auc_test, accuracy_cv_mean, accuracy_cv_std, n_train, n_test, leakage_audit: "..."}`. ~30 min. Makes the headline number a queryable artefact, not a notebook cell.
10. **Document the proxy-vs-real gap** in README. ~30 min. State explicitly: "Labels are derived from OSM + LTA-band-derived travel times, not from SCDF dispatch records. Out-of-sample accuracy on real SCDF data is unknown and is a deliberate non-goal of this prototype."

### Nice-to-have for finals

11. **Add a SCDF-published-statistics sanity check.** ~3 h. SCDF's annual statistics report a national 7m11s median fire response time and similar national EMS numbers. Compute the same statistic on your model's predictions over the 4 demo stations and report agreement.
12. **Conformal prediction wrapper** for the binary probability. ~4 h. Gives you a calibrated "we are 80% sure this station can reach within 8 min" interval instead of a point probability. Lines up with the README's listed-as-out-of-scope item.
13. **Replace the rainfall snapshot with multiple historical snapshots** so you can include rainfall × hour interactions in the training set. ~4 h. NEA's rainfall API accepts `date_time` parameters; you already have the wiring.
14. **Integrate option (b) from §6** — wrap the model in a FastAPI service and call it from the webapp. ~6 h.

---

## 8. Bottom line

The Python prototype is **methodologically far more credible** than the webapp's "AI" surfaces (the webapp has no model). The structure, the choice of baseline, the held-out test setup, and the error analysis are all the right shape for a hackathon ML deliverable.

But the model is unfinished (no artefacts present, no preserved cell outputs) and the moment you do train it, the headline accuracy number will be uninformative in its current configuration because of label leakage. The number is going to look great — 95%+ — and a sharp reviewer will dismantle it in two questions.

The good news: this is a 3-8 h fix, not a redesign. Drop the path-derived features, re-run, and the number you get afterwards is one you can stand behind. Or use OneMap as an independent label source if you have the credits.

The webapp-vs-model integration is a separate problem. The cheapest honest framing is to describe the two as a webapp (operational layer) and a model notebook (analytics layer) — and not claim more than that for the proposal.
