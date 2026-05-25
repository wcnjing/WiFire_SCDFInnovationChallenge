"""Feature engineering for the reach-within-T classifier.

Notebook 3 fills in the synthetic-target generation and ground-truth labelling
on top of these primitives.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable

import numpy as np
import pandas as pd

EARTH_RADIUS_KM = 6371.0088


# Simulated time-of-day congestion multipliers applied to free-flow travel
# times when we lack historical LTA snapshots. Calibrated very roughly against
# Singapore peak/off-peak patterns; documented in Notebook 3.
#
# Multiplier > 1.0 = travel takes longer than free-flow.
TIME_OF_DAY_TRAFFIC_MULT = {
    8: 1.6,   # AM peak
    13: 1.1,  # midday
    18: 1.7,  # PM peak
    23: 1.0,  # late night, free flow
}


def traffic_multiplier(hour: int) -> float:
    """Look up the congestion multiplier for a given hour-of-day."""
    if hour in TIME_OF_DAY_TRAFFIC_MULT:
        return TIME_OF_DAY_TRAFFIC_MULT[hour]
    # Linear interp between the nearest two known hours, wrapping at 24.
    keys = sorted(TIME_OF_DAY_TRAFFIC_MULT.keys())
    for k in keys:
        if hour < k:
            prev = keys[keys.index(k) - 1] if keys.index(k) > 0 else keys[-1]
            span = (k - prev) % 24
            frac = ((hour - prev) % 24) / span if span else 0.0
            return TIME_OF_DAY_TRAFFIC_MULT[prev] * (1 - frac) + TIME_OF_DAY_TRAFFIC_MULT[k] * frac
    return TIME_OF_DAY_TRAFFIC_MULT[keys[-1]]


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two points in kilometres."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def manhattan_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """L1 distance on a flat earth, in kilometres. Useful as a feature."""
    ns = haversine_km(lat1, lng1, lat2, lng1)
    ew = haversine_km(lat1, lng1, lat1, lng2)
    return ns + ew


def bearing_deg(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Initial bearing from (lat1, lng1) toward (lat2, lng2), 0–360°."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lng2 - lng1)
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(y, x)) + 360.0) % 360.0


def cyclical_hour(hour: int) -> tuple[float, float]:
    """Encode hour-of-day as (sin, cos) so 23:00 → 00:00 is continuous."""
    angle = 2 * math.pi * hour / 24.0
    return math.sin(angle), math.cos(angle)


@dataclass
class PathFeatures:
    """Aggregate features computed along a shortest path."""

    num_segments: int
    avg_road_class: float
    expressway_share: float
    avg_speed_band: float
    total_length_km: float
    matched_band_share: float  # fraction of edges where LTA band was known


def aggregate_path(graph, node_path: list[int]) -> PathFeatures:
    """Walk an edge sequence and summarize it for the classifier.

    Assumes `assign_edge_speeds()` has tagged edges with `speed_band` and
    `road_class` (the OSM `highway` tag is mapped via `road_class_ordinal`).
    """
    from .network import road_class_ordinal

    if len(node_path) < 2:
        return PathFeatures(0, 0.0, 0.0, 0.0, 0.0, 0.0)

    road_classes: list[int] = []
    expressway_lengths = 0.0
    total_length = 0.0
    band_values: list[float] = []
    matched = 0
    n_edges = 0

    for u, v in zip(node_path[:-1], node_path[1:]):
        data_dict = graph.get_edge_data(u, v) or {}
        # MultiDiGraph: pick the edge with smallest travel_time_min as canonical.
        edges = list(data_dict.values()) if data_dict else []
        if not edges:
            continue
        edge = min(edges, key=lambda d: d.get("travel_time_min", float("inf")))
        rc = road_class_ordinal(edge.get("highway", "residential"))
        length = edge.get("length", 0.0) or 0.0
        road_classes.append(rc)
        total_length += length
        if rc >= 3:  # trunk or motorway
            expressway_lengths += length
        band = edge.get("speed_band")
        if band is not None and not (isinstance(band, float) and math.isnan(band)):
            band_values.append(float(band))
            matched += 1
        n_edges += 1

    if n_edges == 0:
        return PathFeatures(0, 0.0, 0.0, 0.0, 0.0, 0.0)

    return PathFeatures(
        num_segments=n_edges,
        avg_road_class=float(np.mean(road_classes)) if road_classes else 0.0,
        expressway_share=expressway_lengths / total_length if total_length > 0 else 0.0,
        avg_speed_band=float(np.mean(band_values)) if band_values else 0.0,
        total_length_km=total_length / 1000.0,
        matched_band_share=matched / n_edges,
    )


def rainfall_along_path_mm(
    graph,
    node_path: list[int],
    rainfall_df: pd.DataFrame,
    radius_km: float = 3.0,
) -> float:
    """Mean rainfall (mm) across NEA stations within `radius_km` of the path.

    Cheap proxy: average the rainfall readings whose station falls within
    `radius_km` of any path waypoint. Falls back to overall mean if no station
    is within range.
    """
    if rainfall_df is None or rainfall_df.empty:
        return 0.0
    stations = rainfall_df.dropna(subset=["lat", "lng", "rainfall_mm"]).copy()
    if stations.empty:
        return 0.0

    nearby_values: list[float] = []
    sampled_indices = node_path[:: max(1, len(node_path) // 20)]
    for n in sampled_indices:
        node = graph.nodes[n]
        plat, plng = node["y"], node["x"]
        for _, st in stations.iterrows():
            if haversine_km(plat, plng, st["lat"], st["lng"]) <= radius_km:
                nearby_values.append(float(st["rainfall_mm"]))
    if not nearby_values:
        return float(stations["rainfall_mm"].mean())
    return float(np.mean(nearby_values))
